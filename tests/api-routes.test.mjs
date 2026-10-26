import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_JSON_BODY_BYTES, fail, ok, readJsonBody } from "@/lib/api";

const apiRoot = fileURLToPath(new URL("../src/app/api/", import.meta.url));

// The staff-facing endpoints. Customer, auth and storefront routes have their own helpers and
// response shapes (see src/app/api/account/respond.js) and are not covered by these checks.
const STAFF_AREAS = ["addresses", "admin-roles", "blog", "categories", "cms", "coupons", "customers", "media", "notifications", "orders", "products", "reports", "reviews", "settings", "users"];

function routeFiles() {
  const found = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const file = path.join(dir, name);
      if (statSync(file).isDirectory()) walk(file);
      else if (name === "route.js") found.push(file);
    }
  };
  for (const area of STAFF_AREAS) walk(path.join(apiRoot, area));
  return found.map((file) => ({ name: path.relative(apiRoot, file).split(path.sep).join("/"), source: readFileSync(file, "utf8") }));
}

test("staff routes read JSON bodies through readJsonBody, so a bad or oversized body is a 400/413, not a 500", () => {
  const offenders = routeFiles()
    .filter(({ source }) => /await request\.json\(\)\s*[;)]/.test(source) && !/await request\.json\(\)\.catch\(/.test(source.replace(/await request\.json\(\)\.catch\([^\n]*/g, "")))
    .map(({ name }) => name);
  assert.deepEqual(offenders, []);
});

test("staff routes build the plain { success, data } / { success: false, error } answers with ok() and fail()", () => {
  const plain = /NextResponse\.json\(\s*\{\s*success:\s*(?:false,\s*error(?::\s*[^,{}]+(?:\([^()]*\))?)?|true,\s*data(?::\s*[^,{}]+(?:\([^()]*\))?)?)\s*\}/;
  const offenders = routeFiles().filter(({ source }) => plain.test(source)).map(({ name }) => name);
  assert.deepEqual(offenders, []);
});

test("ok() and fail() answer with the envelope the clients read", async () => {
  const good = ok({ id: 1 }, 201);
  assert.equal(good.status, 201);
  assert.deepEqual(await good.json(), { success: true, data: { id: 1 } });

  const bad = fail("Nope", 404, { field: "email" });
  assert.equal(bad.status, 404);
  assert.deepEqual(await bad.json(), { success: false, error: "Nope", field: "email" });
  assert.equal(fail("Oops").status, 400);
});

const post = (body, headers = {}) => new Request("http://test.local/api/x", { method: "POST", body, headers });

test("readJsonBody needs no size argument: a normal body passes, an invalid one is a 400, a huge one a 413", async () => {
  assert.deepEqual(await readJsonBody(post(JSON.stringify({ a: 1 }))), { payload: { a: 1 } });

  const invalid = await readJsonBody(post("{nope"));
  assert.equal(invalid.response.status, 400);

  const huge = await readJsonBody(post(JSON.stringify({ text: "x".repeat(DEFAULT_JSON_BODY_BYTES) })));
  assert.equal(huge.response.status, 413);

  assert.equal((await readJsonBody(post("{}", { "content-length": String(DEFAULT_JSON_BODY_BYTES + 1) }))).response.status, 413);
});
