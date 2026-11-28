// Price adjustment by metal: against a real PostgreSQL (set TEST_DATABASE_URL to an empty, disposable
// database; CI provides one). Skipped without it.
import test, { describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const url = process.env.TEST_DATABASE_URL;
const root = fileURLToPath(new URL("../", import.meta.url));

const RULES = [
  { metal: "14k", adjustmentValue: "100", adjustmentType: "fixed", adjustmentDirection: "increase" },
  { metal: "18k", adjustmentValue: "20", adjustmentType: "percentage", adjustmentDirection: "increase" },
  { metal: "platinum", adjustmentValue: "250", adjustmentType: "fixed", adjustmentDirection: "increase" },
];

describe("price adjustment by metal", { skip: !url && "TEST_DATABASE_URL is not set" }, () => {
  let db;
  let pricing;
  let band;
  let plain;
  let mixed;
  let categoryId;

  before(async () => {
    process.env.DATABASE_URL = url;
    process.env.DATABASE_POOL_MAX = "1";
    execFileSync(process.execPath, ["scripts/migrate.mjs", "--all"], { cwd: root, env: { ...process.env, DATABASE_URL: url }, encoding: "utf8" });
    db = await import("@/lib/db");
    pricing = await import("@/lib/pricing");
  });

  // A product with a Color option (and optionally a Size option), and one variant per entry:
  // [color, size, price, compareAt]. Option values are positioned in the order given.
  async function makeProduct(handle, price, compareAt, colors, sizes, variants) {
    const [product] = await db.sql`
      INSERT INTO products (title, handle, price, compare_at_price) VALUES (${handle}, ${handle}, ${price}, ${compareAt}) RETURNING id
    `;
    const valueIds = {};
    const addOption = async (name, position, values) => {
      const [option] = await db.sql`INSERT INTO product_options (product_id, name, position) VALUES (${product.id}, ${name}, ${position}) RETURNING id`;
      for (const [index, value] of values.entries()) {
        const [row] = await db.sql`INSERT INTO product_option_values (option_id, value, position) VALUES (${option.id}, ${value}, ${index}) RETURNING id`;
        valueIds[`${name}:${value}`] = row.id;
      }
    };
    await addOption("Color", 0, colors);
    if (sizes.length) await addOption("Size", 1, sizes);

    const ids = {};
    for (const [color, size, vPrice, vCompare] of variants) {
      const [variant] = await db.sql`
        INSERT INTO product_variants (product_id, price, compare_at_price) VALUES (${product.id}, ${vPrice}, ${vCompare}) RETURNING id
      `;
      await db.sql`INSERT INTO variant_option_values (variant_id, option_value_id) VALUES (${variant.id}, ${valueIds[`Color:${color}`]})`;
      if (size) await db.sql`INSERT INTO variant_option_values (variant_id, option_value_id) VALUES (${variant.id}, ${valueIds[`Size:${size}`]})`;
      ids[`${color}|${size ?? ""}`] = variant.id;
    }
    return { id: product.id, variants: ids };
  }

  beforeEach(async () => {
    await db.sql`TRUNCATE products, categories CASCADE`;
    const [category] = await db.sql`INSERT INTO categories (name, slug) VALUES ('Rings', 'rings') RETURNING id`;
    categoryId = category.id;

    band = await makeProduct("band", 1200, 1400, ["14K Rose Gold", "14K White Gold", "18K White Gold", "Platinum"], ["7", "8"], [
      ["14K Rose Gold", "7", 1200, 1400],
      ["14K White Gold", "7", 1200, 1400],
      ["18K White Gold", "7", 1600, 1800],
      ["18K White Gold", "8", null, null],
      ["Platinum", "7", 2400, 2700],
    ]);
    await db.sql`INSERT INTO product_categories (product_id, category_id) VALUES (${band.id}, ${categoryId})`;

    plain = await makeProduct("plain", 500, 600, ["Gold"], [], []);

    mixed = await makeProduct("mixed", 800, null, ["Titanium", "14K Yellow Gold"], [], [
      ["Titanium", null, 800, null],
      ["14K Yellow Gold", null, 1000, null],
    ]);
  });

  const variantRow = async (id) => (await db.sqlQuery("SELECT price, compare_at_price FROM product_variants WHERE id = $1", [id]))[0];
  const productRow = async (id) => (await db.sqlQuery("SELECT price, compare_at_price FROM products WHERE id = $1", [id]))[0];
  const num = (value) => (value == null ? null : Number(value));
  const pair = (row) => [num(row.price), num(row.compare_at_price)];

  test("each metal gets its own adjustment on price and compare-at, across every colour of that metal", async () => {
    const result = await pricing.applyMetalPriceAdjustment({ rules: RULES });
    assert.deepEqual(result, { updatedProductCount: 1, updatedVariantCount: 5, skippedVariantCount: 1 });

    const expected = { "14K Rose Gold|7": [1300, 1500], "14K White Gold|7": [1300, 1500], "18K White Gold|7": [1920, 2160], "Platinum|7": [2650, 2950] };
    for (const [key, values] of Object.entries(expected)) {
      assert.deepEqual(pair(await variantRow(band.variants[key])), values, key);
    }
  });

  test("a variant with no price of its own is skipped and stays null", async () => {
    await pricing.applyMetalPriceAdjustment({ rules: RULES });
    const row = await variantRow(band.variants["18K White Gold|8"]);
    assert.equal(row.price, null);
    assert.equal(row.compare_at_price, null);
  });

  test("a product's own price follows its default variant's metal", async () => {
    await pricing.applyMetalPriceAdjustment({ rules: RULES });
    assert.deepEqual(pair(await productRow(band.id)), [1300, 1500]); // default = 14K Rose Gold, size 7
    assert.equal(num((await productRow(mixed.id)).price), 800); // default = Titanium, which has no metal rule
  });

  test("variants of other metals and products without variants are left alone", async () => {
    await pricing.applyMetalPriceAdjustment({ rules: RULES });
    assert.equal(num((await variantRow(mixed.variants["Titanium|"])).price), 800);
    assert.equal(num((await variantRow(mixed.variants["14K Yellow Gold|"])).price), 1100);
    assert.deepEqual(pair(await productRow(plain.id)), [500, 600]);
  });

  test("only the ticked metals change; the base price stays put when its metal has no rule", async () => {
    await pricing.applyMetalPriceAdjustment({ rules: [RULES[2]] });
    assert.equal(num((await variantRow(band.variants["Platinum|7"])).price), 2650);
    assert.equal(num((await variantRow(band.variants["14K Rose Gold|7"])).price), 1200);
    assert.equal(num((await productRow(band.id)).price), 1200);
  });

  test("a decrease clamps at zero", async () => {
    await pricing.applyMetalPriceAdjustment({ rules: [{ ...RULES[0], adjustmentValue: "5000", adjustmentDirection: "decrease" }] });
    assert.equal(num((await variantRow(band.variants["14K Rose Gold|7"])).price), 0);
  });

  test("scoping to categories leaves products outside them alone", async () => {
    const result = await pricing.applyMetalPriceAdjustment({ rules: RULES, categoryIds: [categoryId] });
    assert.deepEqual(result, { updatedProductCount: 1, updatedVariantCount: 4, skippedVariantCount: 1 });
    assert.equal(num((await variantRow(mixed.variants["14K Yellow Gold|"])).price), 1000);
    assert.equal(num((await productRow(band.id)).price), 1300);
  });

  test("the preview counts what would change, writes nothing, and picks the richest sample product", async () => {
    const preview = await pricing.previewMetalPriceAdjustment();
    assert.deepEqual(preview.metals["14k"], { variantCount: 3, skippedCount: 0, baseProductCount: 1 });
    assert.deepEqual(preview.metals["18k"], { variantCount: 1, skippedCount: 1, baseProductCount: 0 });
    assert.deepEqual(preview.metals.platinum, { variantCount: 1, skippedCount: 0, baseProductCount: 0 });
    assert.equal(preview.sample.title, "band");
    assert.equal(preview.sample.baseMetal, "14k");
    assert.deepEqual(preview.sample.variants.map((variant) => variant.metal), ["14k", "18k", "platinum"]);
    assert.equal(num((await productRow(band.id)).price), 1200);
  });

  test("a failure while writing variants rolls the product prices back too", async () => {
    // The 14K rule moves the product's own price first; the 18K rule then overflows DECIMAL(12,2).
    const rules = [RULES[0], { ...RULES[1], adjustmentType: "fixed", adjustmentValue: "99999999999" }];
    await assert.rejects(() => pricing.applyMetalPriceAdjustment({ rules }));
    assert.equal(num((await productRow(band.id)).price), 1200);
    assert.equal(num((await variantRow(band.variants["14K Rose Gold|7"])).price), 1200);
  });
});
