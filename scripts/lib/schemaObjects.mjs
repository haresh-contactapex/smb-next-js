import { splitStatements } from "./splitStatements.mjs";

// The tables a schema file creates (CREATE TABLE [IF NOT EXISTS] name), read from its
// statements so comments and string literals cannot be mistaken for one.
export function createdTables(source) {
  const names = [];
  for (const statement of splitStatements(source)) {
    const match = /^create\s+table\s+(?:if\s+not\s+exists\s+)?([\w."]+)/i.exec(statement);
    if (match) names.push(match[1]);
  }
  return names;
}

// Those of the file's tables that do not exist in the database the client is connected to.
export async function missingTables(client, source) {
  const missing = [];
  for (const name of createdTables(source)) {
    const { rows } = await client.query("SELECT to_regclass($1::text) AS found", [name]);
    if (!rows[0].found) missing.push(name);
  }
  return missing;
}
