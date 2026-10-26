import { createHash } from "crypto";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import pg from "pg";
import { splitStatements } from "./lib/splitStatements.mjs";
import { MIGRATIONS } from "./migrations.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  let contents;
  try {
    contents = readFileSync(envPath, "utf8");
  } catch {
    return;
  }
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) continue;
    const [, key, rawValue = ""] = match;
    if (process.env[key] !== undefined) continue;
    const value = rawValue.replace(/^(['"])(.*)\1$/, "$2");
    process.env[key] = value;
  }
}

loadEnvLocal();

const ROOT = path.join(__dirname, "..");
const MIGRATION_LOCK_ID = 727274; // arbitrary, but the same for every run

const DEFAULT_SCHEMA_FILE = MIGRATIONS[0];

// node scripts/migrate.mjs                 the catalog schema (docs/category-product/...)
// node scripts/migrate.mjs <file.sql>      one schema file
// node scripts/migrate.mjs --all           every file in scripts/migrations.mjs that is new or changed
// --force re-applies files even when their recorded checksum matches.
// --baseline records the files' current checksums without running them, for a database whose
// schema is already in place (the first run of this runner on an existing database).
const args = process.argv.slice(2);
const force = args.includes("--force");
const baseline = args.includes("--baseline");
const all = args.includes("--all");
const fileArg = args.find((arg) => !arg.startsWith("--"));

function targets() {
  if (all) return MIGRATIONS;
  return [fileArg ? path.relative(ROOT, path.resolve(process.cwd(), fileArg)) : DEFAULT_SCHEMA_FILE];
}

function recordMigration(client, file, checksum) {
  return client.query(
    `INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)
     ON CONFLICT (filename) DO UPDATE SET checksum = EXCLUDED.checksum, applied_at = now()`,
    [file, checksum]
  );
}

// Each file runs in its own transaction, so one that fails halfway leaves nothing applied.
// The record is written inside that transaction, so "applied" and "recorded" cannot disagree.
// Schema files are idempotent (IF NOT EXISTS ...), so a changed file is simply applied again.
async function apply(client, relativeFile) {
  const file = relativeFile.split(path.sep).join("/");
  const source = readFileSync(path.join(ROOT, file), "utf8");
  const checksum = createHash("sha256").update(source).digest("hex");

  const [recorded] = (await client.query("SELECT checksum FROM schema_migrations WHERE filename = $1", [file])).rows;
  if (recorded?.checksum === checksum && !force) {
    process.stdout.write(`Skipping ${file} (already applied)
`);
    return 0;
  }

  if (baseline) {
    await recordMigration(client, file, checksum);
    process.stdout.write(`Recorded ${file} without running it
`);
    return 0;
  }

  const statements = splitStatements(source);
  process.stdout.write(`Applying ${file} (${statements.length} statements)
`);
  await client.query("BEGIN");
  try {
    for (const statement of statements) await client.query(statement);
    await recordMigration(client, file, checksum);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    error.message = `${file}: ${error.message}`;
    throw error;
  }
  return statements.length;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Add it to your .env.local file.");
  }

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    // One runner at a time: a second deploy or a manual run waits here instead of racing, and
    // then finds the first one's files already recorded.
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    let applied = 0;
    for (const file of targets()) applied += await apply(client, file);
    process.stdout.write(`Done — applied ${applied} statements.
`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
