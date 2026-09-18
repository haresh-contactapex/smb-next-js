import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { neon } from "@neondatabase/serverless";

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

const SCHEMA_FILE = path.join(
  __dirname,
  "..",
  "docs",
  "category-product",
  "category-product-catalog-database-schema.sql"
);

function splitStatements(sql) {
  const withoutComments = sql
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
  return withoutComments
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Add it to your .env.local file.");
  }

  const sql = neon(process.env.DATABASE_URL);
  const statements = splitStatements(readFileSync(SCHEMA_FILE, "utf8"));

  for (const statement of statements) {
    const label = statement.split("\n")[0].slice(0, 70);
    process.stdout.write(`Running: ${label}...\n`);
    await sql.query(statement);
  }

  process.stdout.write(`Done — applied ${statements.length} statements.\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
