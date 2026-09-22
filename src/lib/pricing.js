import { sql, sqlQuery } from "./db";

// Adjustment types/directions match the Pricing settings tab (see
// src/components/settings-pricing/helpers.js). Result is always clamped at
// 0 and rounded to 2 decimal places, so it can be written straight to a
// DECIMAL(12,2) price column.
export function calculateAdjustedPrice(originalPrice, adjustmentValue, adjustmentType, adjustmentDirection) {
  const price = Number(originalPrice) || 0;
  const value = Number(adjustmentValue) || 0;
  const sign = adjustmentDirection === "decrease" ? -1 : 1;

  const adjusted = adjustmentType === "fixed" ? price + sign * value : price * (1 + (sign * value) / 100);

  return Math.max(0, Math.round(adjusted * 100) / 100);
}

// Writes every row's new column values back in a single round trip instead
// of one UPDATE per row. `rows` is [{ id, <column>: value, ... }]; `columns`
// is [{ name, cast }] describing every column besides `id`.
async function bulkUpdateColumns(table, rows, columns) {
  if (rows.length === 0) return 0;

  const params = [];
  const stride = columns.length + 1;
  const valueGroups = rows.map((row, index) => {
    const base = index * stride;
    params.push(row.id, ...columns.map((column) => row[column.name]));
    const placeholders = [`$${base + 1}::uuid`, ...columns.map((column, i) => `$${base + 2 + i}::${column.cast}`)];
    return `(${placeholders.join(", ")})`;
  });

  const setClause = columns.map((column) => `${column.name} = v.${column.name}`).join(", ");
  const columnNames = ["id", ...columns.map((column) => column.name)].join(", ");

  await sqlQuery(
    `UPDATE ${table} AS t
       SET ${setClause}, updated_at = now()
     FROM (VALUES ${valueGroups.join(", ")}) AS v(${columnNames})
     WHERE t.id = v.id`,
    params
  );

  return rows.length;
}

// Recalculates every product's price and compare-at price, plus every
// variant's own price (variants with no price of their own already fall
// back to the product's price when read, so they need no row of their
// own), and writes all the new values back. Variant compare-at price is
// left untouched.
export async function applyPriceAdjustmentToAllProducts({ adjustmentValue, adjustmentType, adjustmentDirection }) {
  const adjust = (price) => calculateAdjustedPrice(price, adjustmentValue, adjustmentType, adjustmentDirection);

  const products = await sql`SELECT id, price, compare_at_price FROM products`;
  const productRows = products.map((product) => ({
    id: product.id,
    price: adjust(product.price),
    compare_at_price: product.compare_at_price != null ? adjust(product.compare_at_price) : null,
  }));
  const updatedProductCount = await bulkUpdateColumns("products", productRows, [
    { name: "price", cast: "decimal" },
    { name: "compare_at_price", cast: "decimal" },
  ]);

  const variants = await sql`SELECT id, price FROM product_variants WHERE price IS NOT NULL`;
  const variantRows = variants.map((variant) => ({ id: variant.id, price: adjust(variant.price) }));
  const updatedVariantCount = await bulkUpdateColumns("product_variants", variantRows, [
    { name: "price", cast: "decimal" },
  ]);

  return { updatedProductCount, updatedVariantCount };
}
