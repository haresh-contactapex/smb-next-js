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

const DEFAULT_SCHEMA_FILE = path.join(
  __dirname,
  "..",
  "docs",
  "category-product",
  "category-product-catalog-database-schema.sql"
);

const SCHEMA_FILE = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : DEFAULT_SCHEMA_FILE;

function stripLineComments(sql) {
  return sql
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

// A naive split(";") breaks on any semicolon inside a single-quoted string
// literal (e.g. a COMMENT ON ... IS '...; ...' with punctuation in the text),
// so this walks the source tracking string state and only splits outside one.
// '' inside a string is SQL's escaped single quote, not a terminator.
function splitStatements(sql) {
  const source = stripLineComments(sql);
  const statements = [];
  let current = "";
  let inString = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    current += char;

    if (char === "'") {
      if (inString && source[i + 1] === "'") {
        current += source[++i];
        continue;
      }
      inString = !inString;
      continue;
    }

    if (char === ";" && !inString) {
      const trimmed = current.slice(0, -1).trim();
      if (trimmed) statements.push(trimmed);
      current = "";
    }
  }

  const trailing = current.trim();
  if (trailing) statements.push(trailing);

  return statements;
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
