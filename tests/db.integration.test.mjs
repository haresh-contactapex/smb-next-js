// Runs against a real PostgreSQL: set TEST_DATABASE_URL to an empty, disposable database
// (CI starts one; locally, e.g. a throwaway Docker postgres). Skipped when it is not set.
// The migration test applies every schema file, so the later tests have their tables.
import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const url = process.env.TEST_DATABASE_URL;
const root = fileURLToPath(new URL("../", import.meta.url));

function migrate(...args) {
  return execFileSync(process.execPath, ["scripts/migrate.mjs", ...args], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: url },
    encoding: "utf8",
  });
}

describe("database", { skip: !url && "TEST_DATABASE_URL is not set" }, () => {
  let db;
  let products;

  before(async () => {
    process.env.DATABASE_URL = url;
    process.env.DATABASE_POOL_MAX = "1"; // a nested query that wrongly left the transaction would hang
    migrate("--all");
    db = await import("@/lib/db");
    products = await import("@/lib/products");
  });

  after(async () => {
    await globalThis.__smbPgPool?.end();
  });

  const variant = (sku, size) => ({
    sku, price: "10", inventory_quantity: 1, inventory_management: false, weight: "", weight_unit: "kg", options: { Size: size },
  });
  const payload = (handle, variants, extra = {}) => ({
    title: `Ring ${handle}`, handle, status: "ACTIVE", category: "Rings", tags: ["a"], collections: [],
    pricing: { price: "10" }, options: [{ name: "Size", values: ["5", "6"] }],
    media: [{ type: "image", url: "/uploads/x.jpg", name: "x" }], attributes: [], variants, ...extra,
  });
  const skusOf = async (id) => (await db.sql`SELECT sku FROM product_variants WHERE product_id = ${id} ORDER BY sku`).map((row) => row.sku);
  const unique = () => `t${Date.now()}${Math.floor(Math.random() * 1e6)}`;

  test("migrate --all records files and a second run skips them all", () => {
    const again = migrate("--all");
    assert.ok(!/^Applying/m.test(again), again);
    assert.match(again, /Skipping/);
    assert.match(again, /applied 0 statements/);
  });

  test("migrate --baseline records a file without running it", async () => {
    await db.sql`DELETE FROM schema_migrations WHERE filename = 'docs/media/media-library-schema.sql'`;
    assert.match(migrate("--all", "--baseline"), /Recorded docs\/media\/media-library-schema\.sql without running it/);
    assert.match(migrate("--all"), /Skipping docs\/media\/media-library-schema\.sql/);
  });

  test("a failed update rolls back and keeps the old variants and media", async () => {
    const sku = unique().slice(-8).toUpperCase();
    const handle = unique();
    const id = await products.createProduct(payload(handle, [variant(`${sku}A`, "5"), variant(`${sku}B`, "6")]));
    assert.deepEqual(await skusOf(id), [`${sku}A`, `${sku}B`]);

    await assert.rejects(products.updateProduct(id, payload(handle, [variant(`${sku}C`, "5"), variant(`${sku}C`, "6")])));
    assert.deepEqual(await skusOf(id), [`${sku}A`, `${sku}B`]);
    const [{ n }] = await db.sql`SELECT count(*)::int AS n FROM product_media WHERE product_id = ${id}`;
    assert.equal(n, 1);

    await products.updateProduct(id, payload(handle, [variant(`${sku}D`, "5")])); // the connection is usable again
    assert.deepEqual(await skusOf(id), [`${sku}D`]);
  });

  test("a failed create leaves no product behind", async () => {
    const handle = unique();
    await assert.rejects(products.createProduct(payload(handle, [variant("DUP1", "5"), variant("DUP1", "6")])));
    const [{ n }] = await db.sql`SELECT count(*)::int AS n FROM products WHERE handle = ${handle}`;
    assert.equal(n, 0);
  });

  test("without the engraving column, 'inherit' saves and any other mode is refused", async () => {
    const rollback = new Error("roll back the test's DDL");
    await assert.rejects(
      db.withTransaction(async () => {
        await db.sql`ALTER TABLE products DROP COLUMN engraving_mode`;
        const id = await products.createProduct(payload(unique(), [], { engraving_mode: "inherit" }));
        const [{ n }] = await db.sql`SELECT count(*)::int AS n FROM products WHERE id = ${id}`;
        assert.equal(n, 1);
        await assert.rejects(products.createProduct(payload(unique(), [], { engraving_mode: "enabled" })), /engraving columns are missing/);
        throw rollback; // undo the dropped column and both products
      }),
      (error) => error === rollback
    );
    const [column] = await db.sql`SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'engraving_mode'`;
    assert.ok(column, "the column must be back after the rollback");
  });

  test("sqlTransaction and nested withTransaction join the ambient transaction", async () => {
    const handle = unique();
    const rollback = new Error("roll back");
    await assert.rejects(
      db.withTransaction(async () => {
        await db.sqlTransaction((tx) => [tx`INSERT INTO tags (name) VALUES (${handle})`]);
        await db.withTransaction(async () => db.sql`INSERT INTO tags (name) VALUES (${`${handle}-2`})`);
        const [{ n }] = await db.sql`SELECT count(*)::int AS n FROM tags WHERE name LIKE ${`${handle}%`}`;
        assert.equal(n, 2);
        throw rollback;
      }),
      (error) => error === rollback
    );
    const [{ n }] = await db.sql`SELECT count(*)::int AS n FROM tags WHERE name LIKE ${`${handle}%`}`;
    assert.equal(n, 0, "both inserts must be rolled back with the outer transaction");
  });

  test("a query started in a transaction but not awaited is refused once it has ended", async () => {
    let late;
    await db.withTransaction(async () => {
      late = new Promise((resolve) => setTimeout(resolve, 20)).then(() => db.sql`SELECT 1`);
    });
    await assert.rejects(late, /after its transaction ended/);
  });
});
