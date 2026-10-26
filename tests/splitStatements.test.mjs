import test from "node:test";
import assert from "node:assert/strict";
import { splitStatements } from "../scripts/lib/splitStatements.mjs";

test("splits on semicolons and drops comments", () => {
  assert.deepEqual(
    splitStatements("-- header\nCREATE TABLE a (id int); -- trailing\n/* block; */ CREATE TABLE b (id int);"),
    ["CREATE TABLE a (id int)", "CREATE TABLE b (id int)"]
  );
});

test("keeps -- and ; that sit inside string literals", () => {
  const sql = "INSERT INTO t VALUES ('https://x--y; z');\nCOMMENT ON TABLE t IS 'a -- b';";
  assert.deepEqual(splitStatements(sql), ["INSERT INTO t VALUES ('https://x--y; z')", "COMMENT ON TABLE t IS 'a -- b'"]);
});

test("an escaped quote does not end the string", () => {
  assert.deepEqual(splitStatements("SELECT 'it''s; fine'; SELECT 2"), ["SELECT 'it''s; fine'", "SELECT 2"]);
});

test("keeps semicolons inside dollar-quoted bodies and quoted identifiers", () => {
  const fn = "CREATE FUNCTION f() RETURNS void AS $$ BEGIN PERFORM 1; END; $$ LANGUAGE plpgsql";
  assert.deepEqual(splitStatements(`${fn}; SELECT "a;b" FROM t;`), [fn, 'SELECT "a;b" FROM t']);
});

test("ignores empty statements and whitespace", () => {
  assert.deepEqual(splitStatements(";;\n  ;  SELECT 1;  \n"), ["SELECT 1"]);
});
