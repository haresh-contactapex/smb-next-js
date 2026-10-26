import { AsyncLocalStorage } from 'node:async_hooks';
import { Pool } from 'pg';

// node-postgres over TCP (self-hosted PostgreSQL on cPanel). The exports keep
// `sql` and `sqlQuery` resolve to an array of row objects, and `sqlTransaction`
// resolves to one row array per statement.

// Holds the client of the transaction opened by withTransaction, so `sql` and
// `sqlQuery` called anywhere inside its callback run on that connection.
const transactionClient = new AsyncLocalStorage();

// Kept on globalThis so `next dev` hot reloads reuse one pool instead of
// opening a new set of connections on every module re-evaluation.
function getPool() {
  if (!globalThis.__smbPgPool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set. Add it to your .env.local file.');
    }
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DATABASE_POOL_MAX) || 10,
      idleTimeoutMillis: 30_000,
    });
    // An idle client can error (server restart); without a listener that would
    // crash the process. The pool discards the client and reconnects on demand.
    pool.on('error', (err) => console.error('PostgreSQL pool error:', err.message));
    globalThis.__smbPgPool = pool;
  }
  return globalThis.__smbPgPool;
}

// Turns a tagged template into { text, values } with $1, $2, ... placeholders.
function toQuery(strings, values) {
  let text = strings[0];
  for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
  return { text, values };
}

// Wrapped so the DATABASE_URL check runs when a query actually executes,
// not at import time — Next.js evaluates route modules while collecting
// page data during `next build`, which would fail the build if the env
// var isn't set yet.
export async function sql(strings, ...values) {
  const { text, values: params } = toQuery(strings, values);
  const result = await (transactionClient.getStore() ?? getPool()).query(text, params);
  return result.rows;
}

// Runs `work` in one database transaction: committed when it resolves, rolled
// back when it throws. Unlike sqlTransaction the statements need not be known
// up front, so a later one can use an earlier one's result. `sql` and `sqlQuery`
// calls made inside `work` (including from helpers it calls) join the transaction;
// the client is also passed in for code that wants it directly.
export async function withTransaction(work) {
  if (transactionClient.getStore()) return work(transactionClient.getStore());
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await transactionClient.run(client, () => work(client));
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // The connection is already broken; the original error is the useful one.
    }
    throw error;
  } finally {
    client.release();
  }
}

// Several statements applied together or not at all, in one database
// transaction. `build` receives a tagged template and returns the statements
// in order:
//   await sqlTransaction((tx) => [tx`UPDATE ...`, tx`UPDATE ...`]);
// Statements run in the order given, which matters for partial unique indexes
// (clear the old row before setting the new one).
export async function sqlTransaction(build) {
  const statements = build((strings, ...values) => toQuery(strings, values));
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const results = [];
    for (const { text, values } of statements) {
      results.push((await client.query(text, values)).rows);
    }
    await client.query('COMMIT');
    return results;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // The connection is already broken; the original error is the useful one.
    }
    throw error;
  } finally {
    client.release();
  }
}

// Raw parameterized query ($1, $2, ...) for cases the tagged-template form
// can't express, such as a dynamically-sized multi-row INSERT.
export async function sqlQuery(text, params) {
  const result = await (transactionClient.getStore() ?? getPool()).query(text, params);
  return result.rows;
}
