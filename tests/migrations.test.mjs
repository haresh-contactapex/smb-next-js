import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { MANUAL_ONLY, MIGRATIONS } from "../scripts/migrations.mjs";
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
