// importProductsFromCsv() turns CSV rows into createProduct() payloads. createProduct is replaced
// with a recorder that applies the server's real payload validator, so a row the server would
// refuse is reported as failed here too, and nothing touches a database.
import test, { before, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validateProductPayload, describeProductErrors } from "@/lib/shared/product";

const lib = (name) => pathToFileURL(fileURLToPath(new URL(`../src/lib/${name}.js`, import.meta.url))).href;

let saved;
let failTitles;
let importProductsFromCsv;
let IMPORT_MAX_ROWS;

before(async () => {
  mock.module(lib("products"), {
    exports: {
      slugify: (str) => String(str).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      createProduct: async (payload) => {
        const problems = validateProductPayload(payload);
        if (problems.length) throw new Error(describeProductErrors(problems));
        if (failTitles.has(payload.title)) throw new Error("A product with that handle already exists.");
        saved.push(payload);
        return `id-${saved.length}`;
      },
    },
  });
  ({ importProductsFromCsv, IMPORT_MAX_ROWS } = await import("@/lib/productImport"));
});

beforeEach(() => {
  saved = [];
  failTitles = new Set();
});

const csv = (...lines) => lines.join("\n");
const HEADER = "title,sku,price";

test("a plain row becomes one simple product with the defaults the form uses", async () => {
  const summary = await importProductsFromCsv(csv(HEADER, "Gold Ring,GR1,49.99"));
  assert.deepEqual(summary, { created: 1, failed: [] });
  const [product] = saved;
  assert.equal(product.title, "Gold Ring");
  assert.equal(product.handle, "gold-ring");
  assert.equal(product.status, "ACTIVE");
  assert.equal(product.pricing.price, 49.99);
  assert.equal(product.inventory.sku, "GR1");
  assert.equal(product.shipping.weight_unit, "kg");
  assert.equal(product.pricing.charge_tax, true);
  assert.deepEqual(product.variants, []);
});

test("column names are matched regardless of case and spacing", async () => {
  const summary = await importProductsFromCsv(csv(" Title ,SKU, Price ,Compare At Price,Product Type", "Ring,R1,10,15,Jewelry"));
  assert.equal(summary.created, 1);
  assert.equal(saved[0].pricing.compare_at_price, 15);
  assert.equal(saved[0].product_type, "Jewelry");
});

test("a CSV without the required columns is refused up front", async () => {
  await assert.rejects(importProductsFromCsv("title,price\nRing,10"), /missing required column\(s\): sku/);
  await assert.rejects(importProductsFromCsv("name\nRing"), /missing required column\(s\): title, sku, price/);
});

test("an empty file, and one over the row limit, are refused", async () => {
  await assert.rejects(importProductsFromCsv(HEADER), /no data rows/);
  const rows = Array.from({ length: IMPORT_MAX_ROWS + 1 }, (_, i) => `P${i},S${i},1`);
  await assert.rejects(importProductsFromCsv(csv(HEADER, ...rows)), /import limit is 2000/);
  assert.equal(saved.length, 0);
});

test("a malformed CSV is reported with its row", async () => {
  await assert.rejects(importProductsFromCsv(csv(HEADER, 'Ring,R1,"10')), /Could not parse the CSV file/);
});

test("bad numbers are reported per row and the other products still import", async () => {
  const summary = await importProductsFromCsv(
    csv(HEADER, "Good,G1,10", "Negative,N1,-5", "Infinite,I1,1e999", "Words,W1,ten", "Blank,B1,", "Also Good,A1,20")
  );
  assert.equal(summary.created, 2);
  assert.deepEqual(summary.failed.map((f) => [f.row, f.title]), [[3, "Negative"], [4, "Infinite"], [5, "Words"], [6, "Blank"]]);
  assert.match(summary.failed[0].error, /price must be a non-negative number/);
  assert.match(summary.failed[3].error, /price is required/);
  assert.deepEqual(saved.map((p) => p.title), ["Good", "Also Good"]);
});

test("every problem in one row is listed together", async () => {
  const summary = await importProductsFromCsv(csv("title,sku,price,status,weight_unit,weight", ",,abc,live,stone,-1"));
  assert.equal(summary.created, 0);
  const message = summary.failed[0].error;
  for (const part of [/title is required/, /sku is required/, /price must be/, /status must be one of/, /weight_unit must be one of/, /weight must be/]) {
    assert.match(message, part);
  }
});

test("status and weight unit are normalised; an unknown one is an error", async () => {
  await importProductsFromCsv(csv("title,sku,price,status,weight_unit", "Draft Ring,D1,10, draft ,LB"));
  assert.equal(saved[0].status, "DRAFT");
  assert.equal(saved[0].shipping.weight_unit, "lb");
});

test("a free product cannot be imported as ACTIVE, but can as a draft", async () => {
  const summary = await importProductsFromCsv(csv("title,sku,price,status", "Free,F1,0,active", "Free Draft,F2,0,draft"));
  assert.equal(summary.created, 1);
  assert.equal(saved[0].title, "Free Draft");
  assert.match(summary.failed[0].error, /Price must be greater than zero/);
});

test("a handle that cannot make a URL is reported", async () => {
  const summary = await importProductsFromCsv(csv(HEADER, "!!!,S1,10"));
  assert.equal(summary.created, 0);
  assert.match(summary.failed[0].error, /URL handle is empty/);
});

test("a failure from the save is recorded and the import carries on", async () => {
  failTitles.add("Duplicate");
  const summary = await importProductsFromCsv(csv(HEADER, "Duplicate,D1,10", "Fine,F1,10"));
  assert.equal(summary.created, 1);
  assert.deepEqual(summary.failed, [{ row: 2, title: "Duplicate", sku: "D1", error: "A product with that handle already exists." }]);
});

test("lists, booleans and text columns are read as the form would send them", async () => {
  await importProductsFromCsv(
    csv(
      "title,sku,price,category,collections,tags,image_url,track_quantity,charge_tax,description,seo_title",
      'Ring,R1,10,Jewelry > Rings,"Summer; Sale",gold;ring,https://x.test/a.jpg;https://x.test/b.jpg,no,false,<p>Hi</p>,Ring SEO'
    )
  );
  const [product] = saved;
  assert.equal(product.category, "Jewelry > Rings");
  assert.deepEqual(product.collections, ["Summer", "Sale"]);
  assert.deepEqual(product.tags, ["gold", "ring"]);
  assert.deepEqual(product.media.map((m) => m.url), ["https://x.test/a.jpg", "https://x.test/b.jpg"]);
  assert.equal(product.inventory.track_quantity, false);
  assert.equal(product.pricing.charge_tax, false);
  assert.equal(product.body_html, "<p>Hi</p>");
  assert.equal(product.seo.title, "Ring SEO");
});

test("rows that share a handle become one product with options and variants", async () => {
  const header =
    "handle,title,sku,price,option1_name,option1_value,option2_name,option2_value,variant_sku,variant_price,variant_inventory_quantity";
  const summary = await importProductsFromCsv(
    csv(
      header,
      "band,Band,B1,10,Size,5,Metal,Gold,B-5-G,10,3",
      "band,,,,Size,6,Metal,Gold,B-6-G,12,0",
      "band,,,,Size,6,Metal,Silver,B-6-S,14,",
      "other,Other,O1,5,,,,,,,"
    )
  );
  assert.deepEqual(summary, { created: 2, failed: [] });
  const [band, other] = saved;
  assert.deepEqual(band.options, [
    { name: "Size", values: ["5", "6"] },
    { name: "Metal", values: ["Gold", "Silver"] },
  ]);
  assert.deepEqual(band.variants.map((v) => [v.sku, v.price, v.inventory_quantity, v.options]), [
    ["B-5-G", 10, 3, { Size: "5", Metal: "Gold" }],
    ["B-6-G", 12, 0, { Size: "6", Metal: "Gold" }],
    ["B-6-S", 14, 0, { Size: "6", Metal: "Silver" }],
  ]);
  assert.deepEqual(other.variants, []);
});

test("variant rows are validated: sku, price, whole quantities and option values", async () => {
  const header = "handle,title,sku,price,option1_name,option1_value,variant_sku,variant_price,variant_inventory_quantity";
  const summary = await importProductsFromCsv(
    csv(
      header,
      "a,A,A1,10,Size,5,,10,1", // no variant sku
      "b,B,B1,10,Size,5,B-5,-3,1", // negative price
      "c,C,C1,10,Size,5,C-5,10,1.5", // fractional quantity
      "d,D,D1,10,Size,,D-5,10,1", // option value missing
      "e,E,E1,10,Size,5,E-5,Infinity,1" // non-finite price
    )
  );
  assert.equal(summary.created, 0);
  assert.match(summary.failed[0].error, /variant_sku is required/);
  assert.match(summary.failed[1].error, /variant_price must be a non-negative number/);
  assert.match(summary.failed[2].error, /variant_inventory_quantity must be a non-negative whole number/);
  assert.match(summary.failed[3].error, /option1_value is required when option1_name is set/);
  assert.match(summary.failed[4].error, /variant_price must be a non-negative number/);
});

test("attributes come from numbered label/value columns on the first row", async () => {
  await importProductsFromCsv(csv("title,sku,price,attribute2_label,attribute2_value,attribute1_label,attribute1_value", "Ring,R1,10,Origin,Italy,Material,Gold"));
  assert.deepEqual(saved[0].attributes, [
    { label: "Material", value: "Gold" },
    { label: "Origin", value: "Italy" },
  ]);

  const summary = await importProductsFromCsv(csv("title,sku,price,attribute1_label,attribute1_value", `Ring2,R2,10,${"x".repeat(101)},v`, "Ring3,R3,10,,orphan"));
  assert.match(summary.failed[0].error, /attribute1_label must be 100 characters or fewer/);
  assert.match(summary.failed[1].error, /attribute1_label is required when attribute1_value is set/);
});
