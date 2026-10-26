import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isUuid, parseUuidList } from "@/lib/shared/ids";
import { slugify } from "@/lib/shared/slug";
import { slugify as cmsSlugify, CMS_SLUG_MAX } from "@/lib/cmsRules";
import { slugify as productFormSlugify } from "@/components/add-product/helpers";
import { slugify as categoryFormSlugify } from "@/components/add-category/helpers";
import { readBulkIds, MAX_BULK_IDS } from "@/lib/bulkIds";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

test("isUuid accepts the 8-4-4-4-12 hex form in either case and nothing else", () => {
  assert.equal(isUuid(A), true);
  assert.equal(isUuid(A.toUpperCase()), true);
  for (const bad of ["", "undefined", `${A} `, ` ${A}`, `${A}0`, A.slice(1), A.replace(/-/g, ""), "g".repeat(8) + A.slice(8), 5, null, undefined, {}, [A], new String(A)]) {
    assert.equal(isUuid(bad), false, String(bad));
  }
});

test("parseUuidList returns the distinct ids, or null for anything unusable", () => {
  assert.deepEqual(parseUuidList([A, B, A]), [A, B]);
  for (const bad of [undefined, null, "x", {}, [], [A, "nope"], [A, 5], [A, null]]) assert.equal(parseUuidList(bad), null, JSON.stringify(bad));
  assert.deepEqual(parseUuidList([A, B], { max: 2 }), [A, B]);
  assert.equal(parseUuidList([A, B], { max: 1 }), null);
  assert.deepEqual(parseUuidList([A, A], { max: 1 }), [A]); // the limit counts distinct ids
});

const bulk = (body) => new Request("http://test.local/api/x", { method: "DELETE", body: typeof body === "string" ? body : JSON.stringify(body) });

test("readBulkIds: distinct ids, with the same messages for every list", async () => {
  assert.deepEqual(await readBulkIds(bulk({ ids: [A, B, A] }), "product"), { ids: [A, B] });
  assert.deepEqual(await readBulkIds(bulk({ ids: [] }), "coupon"), { error: "Select at least one coupon to delete." });
  assert.deepEqual(await readBulkIds(bulk("not json"), "coupon"), { error: "Select at least one coupon to delete." });
  assert.deepEqual(await readBulkIds(bulk({}), "order", "cancel"), { error: "Select at least one order to cancel." });
  assert.deepEqual(await readBulkIds(bulk({ ids: [A, "x"] }), "customer"), { error: "Invalid customer selection." });
  assert.deepEqual(await readBulkIds(bulk({ ids: [A, 5] }), "customer"), { error: "Invalid customer selection." });
});

test("readBulkIds: the limit is per call, 1000 by default", async () => {
  const many = (n) => Array.from({ length: n }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
  assert.equal((await readBulkIds(bulk({ ids: many(MAX_BULK_IDS) }), "post")).ids.length, MAX_BULK_IDS);
  assert.deepEqual(await readBulkIds(bulk({ ids: many(MAX_BULK_IDS + 1) }), "post"), { error: "Invalid post selection." });
  assert.equal((await readBulkIds(bulk({ ids: many(1500) }), "product", "delete", { max: 5000 })).ids.length, 1500);
});

test("slugify: lower-case words joined by single hyphens", () => {
  for (const [input, expected] of [
    ["Gold Ring", "gold-ring"],
    ["  Gold   Ring  ", "gold-ring"],
    ["Gold Ring (18K) — Size 7", "gold-ring-18k-size-7"],
    ["--Already--Hyphenated--", "already-hyphenated"],
    ["Café Ring", "caf-ring"],
    ["Women's Wedding Bands", "women-s-wedding-bands"],
    ["!!!", ""],
    ["", ""],
    [null, ""],
    [undefined, ""],
    [42, "42"],
  ]) {
    assert.equal(slugify(input), expected, JSON.stringify(input));
  }
});

test("slugify: max cuts the slug and never leaves a hyphen at the end", () => {
  assert.equal(slugify("one two three", { max: 7 }), "one-two");
  assert.equal(slugify("one two three", { max: 8 }), "one-two");
  assert.equal(slugify("one two three", { max: 9 }), "one-two-t");
  assert.equal(slugify("abc", { max: 10 }), "abc");
  assert.equal(slugify("a".repeat(150), { max: 100 }).length, 100);
});

test("every form and the CMS give the same handle for the same title", () => {
  for (const title of ["Gold Ring", "  A  &  B  ", "Rings > Wedding Bands", "Ünïcode Café", "!!!", "x".repeat(40)]) {
    assert.equal(productFormSlugify(title), slugify(title));
    assert.equal(categoryFormSlugify(title), slugify(title));
    assert.equal(cmsSlugify(title), slugify(title, { max: CMS_SLUG_MAX }));
  }
  assert.equal(cmsSlugify("a-".repeat(80)).length <= CMS_SLUG_MAX, true);
  assert.equal(cmsSlugify("a ".repeat(80)).endsWith("-"), false);
});

// A copy of the UUID pattern next to the code that needs it is how ids ended up validated in ten
// slightly different ways; everything imports isUuid from shared/ids instead.
test("the UUID pattern is defined once, in src/lib/shared/ids.js", () => {
  const src = fileURLToPath(new URL("../src/", import.meta.url));
  const copies = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const file = path.join(dir, name);
      if (statSync(file).isDirectory()) walk(file);
      else if (/\.(js|mjs)$/.test(name) && readFileSync(file, "utf8").includes("0-9a-f]{8}-")) copies.push(path.relative(src, file).replace(/\\/g, "/"));
    }
  };
  walk(src);
  assert.deepEqual(copies, ["lib/shared/ids.js"]);
});
