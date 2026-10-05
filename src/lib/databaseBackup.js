import { sqlQuery } from "./db";

// Logical backup of the public schema as a plain SQL script. Neon is reached
// over HTTP, so pg_dump isn't available — this rebuilds an equivalent script
// (sequences, tables, rows, constraints, indexes) that restores with psql into
// an empty database. It is read-only and not a single-transaction snapshot:
// rows written while it runs may or may not be included.

const BATCH_ROWS = 500;

const ident = (name) => `"${String(name).replace(/"/g, '""')}"`;
const qualified = (name) => `public.${ident(name)}`;

async function listTables() {
  const rows = await sqlQuery(`
    SELECT c.relname AS name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname
  `);
  return rows.map((row) => row.name);
}

async function countRows(table) {
  const [row] = await sqlQuery(`SELECT count(*)::int AS n FROM ${qualified(table)}`);
  return row.n;
}

async function loadConstraints(table) {
  return sqlQuery(
    `SELECT conname, contype, pg_get_constraintdef(oid) AS def
     FROM pg_constraint WHERE conrelid = $1::regclass AND contype IN ('p','u','c','f','x')
     ORDER BY conname`,
    [qualified(table)]
  );
}

// Indexes that aren't the backing index of a constraint (those come back with
// their constraint).
async function loadIndexes(table) {
  const rows = await sqlQuery(
    `SELECT indexdef FROM pg_indexes
     WHERE schemaname = 'public' AND tablename = $1
       AND indexname NOT IN (SELECT conname FROM pg_constraint WHERE conrelid = $2::regclass)
     ORDER BY indexname`,
    [table, qualified(table)]
  );
  return rows.map((row) => row.indexdef);
}

async function loadColumns(table) {
  return sqlQuery(
    `
    SELECT a.attname AS name,
           format_type(a.atttypid, a.atttypmod) AS type,
           a.attnotnull AS not_null,
           a.attgenerated AS generated,
           pg_get_expr(d.adbin, d.adrelid) AS default_expr
    FROM pg_attribute a
    LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    WHERE a.attrelid = $1::regclass AND a.attnum > 0 AND NOT a.attisdropped
    ORDER BY a.attnum
  `,
    [qualified(table)]
  );
}

function createTableSql(table, columns) {
  const defs = columns.map((col) => {
    let def = `  ${ident(col.name)} ${col.type}`;
    if (col.generated) def += ` GENERATED ALWAYS AS (${col.default_expr}) STORED`;
    else if (col.default_expr) def += ` DEFAULT ${col.default_expr}`;
    if (col.not_null) def += " NOT NULL";
    return def;
  });
  return `CREATE TABLE ${qualified(table)} (\n${defs.join(",\n")}\n);\n\n`;
}

// Yields progress events for the caller to stream:
//   { type: "start", tables, totalRows }
//   { type: "chunk", sql }
//   { type: "progress", done, total, table }
//   { type: "done", bytes, tables, rows }
export async function* generateDatabaseBackup({ isCancelled = () => false } = {}) {
  const tables = await listTables();
  // Looked up in parallel: one round trip of latency instead of one per table.
  const meta = await Promise.all(
    tables.map(async (table) => {
      const [count, columns, constraints, indexes] = await Promise.all([
        countRows(table),
        loadColumns(table),
        loadConstraints(table),
        loadIndexes(table),
      ]);
      return { count, columns, constraints, indexes };
    })
  );
  const counts = meta.map((m) => m.count);
  const totalRows = counts.reduce((sum, n) => sum + n, 0);
  let bytes = 0;
  const chunk = (sql) => {
    bytes += Buffer.byteLength(sql);
    return { type: "chunk", sql };
  };

  yield { type: "start", tables: tables.length, totalRows };

  yield chunk(
    `-- Shop My Band database backup\n` +
      `-- Created: ${new Date().toISOString()}\n` +
      `-- Tables: ${tables.length}, rows: ${totalRows}\n` +
      `-- Restore into an EMPTY database:  psql "$DATABASE_URL" -f <this file>\n\n` +
      `SET client_encoding = 'UTF8';\n` +
      `CREATE EXTENSION IF NOT EXISTS pgcrypto;\n\n`
  );

  const sequences = await sqlQuery(
    `SELECT sequencename AS name, last_value FROM pg_sequences WHERE schemaname = 'public' ORDER BY sequencename`
  );
  for (const seq of sequences) yield chunk(`CREATE SEQUENCE IF NOT EXISTS ${qualified(seq.name)};\n`);
  if (sequences.length) yield chunk("\n");

  for (let t = 0; t < tables.length; t++) yield chunk(createTableSql(tables[t], meta[t].columns));

  let done = 0;
  yield { type: "progress", done, total: totalRows, table: null };

  for (let t = 0; t < tables.length; t++) {
    const table = tables[t];
    const insertable = meta[t].columns.filter((col) => !col.generated);
    if (!counts[t] || !insertable.length) continue;

    const columnList = insertable.map((col) => ident(col.name)).join(", ");
    // quote_nullable() lets Postgres render every value (json, arrays, bytea,
    // timestamps...) as a literal that casts back to the column's type.
    const valueExpr = insertable.map((col) => `quote_nullable(${ident(col.name)})`).join(` || ', ' || `);
    yield chunk(`-- Data: ${table} (${counts[t]} rows)\n`);

    for (let offset = 0; offset < counts[t]; offset += BATCH_ROWS) {
      if (isCancelled()) return;
      const rows = await sqlQuery(
        `SELECT ${valueExpr} AS v FROM ${qualified(table)} ORDER BY ctid LIMIT ${BATCH_ROWS} OFFSET ${offset}`
      );
      if (!rows.length) break;
      yield chunk(
        `INSERT INTO ${qualified(table)} (${columnList}) VALUES\n` +
          rows.map((row) => `  (${row.v})`).join(",\n") +
          ";\n"
      );
      done += rows.length;
      yield { type: "progress", done, total: totalRows, table };
    }
    yield chunk("\n");
  }

  for (const seq of sequences) {
    if (seq.last_value != null) {
      yield chunk(`SELECT setval('${qualified(seq.name).replace(/'/g, "''")}', ${seq.last_value});\n`);
    }
  }

  // Constraints go after the data so insert order never matters; foreign keys
  // last so every referenced table already has its primary key.
  const constraints = tables.flatMap((table, t) => meta[t].constraints.map((con) => ({ table, ...con })));
  const indexes = meta.flatMap((m) => m.indexes);

  yield chunk("\n");
  for (const con of constraints.filter((c) => c.contype !== "f")) {
    yield chunk(`ALTER TABLE ONLY ${qualified(con.table)} ADD CONSTRAINT ${ident(con.conname)} ${con.def};\n`);
  }
  for (const sql of indexes) yield chunk(`${sql};\n`);
  for (const con of constraints.filter((c) => c.contype === "f")) {
    yield chunk(`ALTER TABLE ONLY ${qualified(con.table)} ADD CONSTRAINT ${ident(con.conname)} ${con.def};\n`);
  }

  yield { type: "done", bytes, tables: tables.length, rows: totalRows };
}
