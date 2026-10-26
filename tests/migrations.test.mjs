import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { MANUAL_ONLY, MIGRATIONS, REFERENCE_ONLY } from "../scripts/migrations.mjs";
import { createdTables } from "../scripts/lib/schemaObjects.mjs";
import { splitStatements } from "../scripts/lib/splitStatements.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const scripts = JSON.parse(readFileSync(`${root}package.json`, "utf8")).scripts;

test("every listed schema file exists, once, and has statements", () => {
  assert.equal(new Set(MIGRATIONS).size, MIGRATIONS.length);
  for (const file of [...MIGRATIONS, ...MANUAL_ONLY]) {
    assert.ok(existsSync(root + file), `${file} is missing`);
    assert.ok(splitStatements(readFileSync(root + file, "utf8")).length > 0, `${file} has no statements`);
  }
});

test("a manual-only file is not also in the ordered list", () => {
  for (const file of MANUAL_ONLY) assert.ok(!MIGRATIONS.includes(file), `${file} is in both lists`);
});

test("every db:migrate:* npm script's file is in scripts/migrations.mjs", () => {
  const listed = new Set([...MIGRATIONS, ...MANUAL_ONLY]);
  for (const [name, command] of Object.entries(scripts)) {
    if (!name.startsWith("db:migrate:")) continue;
    const file = command.match(/migrate\.mjs\s+(docs\/\S+\.sql)/)?.[1];
    if (file) assert.ok(listed.has(file), `npm run ${name} applies ${file}, which is not in scripts/migrations.mjs`);
  }
});

function sqlFilesUnder(dir) {
  return readdirSync(root + dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? sqlFilesUnder(`${dir}/${entry.name}`) : entry.name.endsWith(".sql") ? [`${dir}/${entry.name}`] : []
  );
}

test("every schema file under docs/ is applied, manual-only or reference-only", () => {
  const known = new Set([...MIGRATIONS, ...MANUAL_ONLY, ...REFERENCE_ONLY]);
  for (const file of sqlFilesUnder("docs")) {
    assert.ok(known.has(file), `${file} is not in scripts/migrations.mjs (MIGRATIONS, MANUAL_ONLY or REFERENCE_ONLY)`);
  }
  for (const file of REFERENCE_ONLY) assert.ok(!MIGRATIONS.includes(file), `${file} is applied and reference-only`);
});

test("createdTables reads CREATE TABLE statements, not comments or strings", () => {
  const source = [
    "-- CREATE TABLE won",
    "CREATE TABLE IF NOT EXISTS a (id int);",
    "CREATE TABLE public.b (id int);",
    "COMMENT ON TABLE a IS 'create table c';",
    "CREATE INDEX i ON a (id);",
  ].join("\n");
  assert.deepEqual(createdTables(source), ["a", "public.b"]);
});
