// Tagged-template SQL client for the CLI scripts, backed by node-postgres so they work
// against a plain PostgreSQL server (cPanel). `pgTagged(url)` returns a function that is a
// tagged template resolving to row objects and also has `.query(text, params)`.
import pg from "pg";

export function pgTagged(connectionString) {
  // allowExitOnIdle lets a one-shot script end once its work is done.
  const pool = new pg.Pool({ connectionString, max: 4, allowExitOnIdle: true });

  async function sql(strings, ...values) {
    let text = strings[0];
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
    return (await pool.query(text, values)).rows;
  }
  sql.query = async (text, params) => (await pool.query(text, params)).rows;
  return sql;
}
