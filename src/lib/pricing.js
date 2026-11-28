import { sql, sqlQuery, withTransaction } from "./db";
import { PRICING_METALS, METAL_OPTION_PATTERN, calculateAdjustedPrice, metalGroupOf } from "./shared/settingsPricing";

export { calculateAdjustedPrice };

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

async function selectProductsInScope(categoryIds) {
  if (Array.isArray(categoryIds) && categoryIds.length > 0) {
    return sql`
      SELECT DISTINCT p.id, p.title, p.price, p.compare_at_price
      FROM products p
      WHERE p.category_id = ANY(${categoryIds}::uuid[])
         OR EXISTS (
           SELECT 1 FROM product_categories pc
           WHERE pc.product_id = p.id AND pc.category_id = ANY(${categoryIds}::uuid[])
         )
    `;
  }
  return sql`SELECT id, title, price, compare_at_price FROM products`;
}

// Recalculates every product's price and compare-at price, plus every
// variant's own price (variants with no price of their own already fall
// back to the product's price when read, so they need no row of their
// own), and writes all the new values back. Variant compare-at price is
// left untouched.
//
// `categoryIds` narrows this to products in those categories — a product
// counts if its primary category (products.category_id) or any other one
// it's listed under (product_categories) is in the list — same membership
// rule as productsInCategoryTree() in src/lib/storefrontCart.js, but without
// that one's sub-category recursion: only the categories actually selected
// are matched. Pass null/empty (the default) to adjust every product.
export async function applyPriceAdjustmentToAllProducts({
  adjustmentValue,
  adjustmentType,
  adjustmentDirection,
  categoryIds = null,
}) {
  const adjust = (price) => calculateAdjustedPrice(price, adjustmentValue, adjustmentType, adjustmentDirection);
  const scoped = Array.isArray(categoryIds) && categoryIds.length > 0;

  const products = await selectProductsInScope(categoryIds);
  const productRows = products.map((product) => ({
    id: product.id,
    price: adjust(product.price),
    compare_at_price: product.compare_at_price != null ? adjust(product.compare_at_price) : null,
  }));
  const updatedProductCount = await bulkUpdateColumns("products", productRows, [
    { name: "price", cast: "decimal" },
    { name: "compare_at_price", cast: "decimal" },
  ]);

  const productIds = products.map((product) => product.id);
  const variants = scoped
    ? await sql`SELECT id, price FROM product_variants WHERE price IS NOT NULL AND product_id = ANY(${productIds}::uuid[])`
    : await sql`SELECT id, price FROM product_variants WHERE price IS NOT NULL`;
  const variantRows = variants.map((variant) => ({ id: variant.id, price: adjust(variant.price) }));
  const updatedVariantCount = await bulkUpdateColumns("product_variants", variantRows, [
    { name: "price", cast: "decimal" },
  ]);

  return { updatedProductCount, updatedVariantCount };
}

// ---------------------------------------------------------------------------
// Price adjustment by metal
// ---------------------------------------------------------------------------

// Every variant of the products in scope, with the option values that define it.
async function selectVariantsWithOptions(productIds) {
  if (productIds.length === 0) return [];
  return sql`
    SELECT v.id, v.product_id, v.price, v.compare_at_price,
           o.name AS option_name, o.position AS option_position,
           ov.value AS option_value, ov.position AS value_position
    FROM product_variants v
    LEFT JOIN variant_option_values vov ON vov.variant_id = v.id
    LEFT JOIN product_option_values ov ON ov.id = vov.option_value_id
    LEFT JOIN product_options o ON o.id = ov.option_id
    WHERE v.product_id = ANY(${productIds}::uuid[])
  `;
}

// Folds the joined rows into one record per variant: its prices, its metal group (from the
// colour/metal option) and a rank that orders it the way the product's options do — first
// colour, then first size, ... — the same order the storefront uses to pick a default variant
// (variantsInOptionOrder in src/components/storefront/wishlist/wishlistHelpers.js).
function groupVariants(rows) {
  const byId = new Map();
  for (const row of rows) {
    let variant = byId.get(row.id);
    if (!variant) {
      variant = { id: row.id, productId: row.product_id, price: row.price, compareAt: row.compare_at_price, options: [] };
      byId.set(row.id, variant);
    }
    if (row.option_name != null) {
      variant.options.push({
        name: row.option_name,
        position: Number(row.option_position),
        value: row.option_value,
        valuePosition: Number(row.value_position),
      });
    }
  }

  for (const variant of byId.values()) {
    variant.options.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
    variant.rank = variant.options.map((option) => option.valuePosition);
    const colorOption = variant.options.find(
      (option) => METAL_OPTION_PATTERN.test(option.name) && metalGroupOf(option.value)
    );
    variant.metal = colorOption ? metalGroupOf(colorOption.value) : null;
  }
  return [...byId.values()];
}

function compareVariants(a, b) {
  for (let i = 0; i < Math.max(a.rank.length, b.rank.length); i += 1) {
    const diff = (a.rank[i] ?? 0) - (b.rank[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return String(a.id).localeCompare(String(b.id));
}

// Works out every row a metal adjustment would write, without writing anything, so the
// preview and the real apply can never disagree. `adjusters` maps a metal group to
// (price) => newPrice; a metal with no entry is left alone.
//
// - A variant is repriced when its metal has a rule: its own price and its compare-at price
//   each move if set. A variant with no price of its own falls back to its product's price
//   when read, so it can't be told apart from its siblings and is counted as skipped.
// - A product's own price and compare-at price follow the rule of its default variant (the
//   first one in option order), so the listing price moves with the metal shoppers see first.
async function planMetalAdjustment(categoryIds, adjusters) {
  const products = await selectProductsInScope(categoryIds);
  const variants = groupVariants(await selectVariantsWithOptions(products.map((product) => product.id)));

  const variantsByProduct = new Map();
  for (const variant of variants) {
    if (!variantsByProduct.has(variant.productId)) variantsByProduct.set(variant.productId, []);
    variantsByProduct.get(variant.productId).push(variant);
  }

  const stats = Object.fromEntries(
    PRICING_METALS.map((metal) => [metal.value, { variantCount: 0, skippedCount: 0, baseProductCount: 0 }])
  );
  const variantRows = [];
  const productRows = [];
  let sample = null;

  for (const product of products) {
    const siblings = (variantsByProduct.get(product.id) || []).sort(compareVariants);
    if (siblings.length === 0) continue;

    const defaultVariant = siblings[0];
    const baseAdjust = defaultVariant.metal ? adjusters[defaultVariant.metal] : null;
    if (defaultVariant.metal) stats[defaultVariant.metal].baseProductCount += 1;
    if (baseAdjust) {
      productRows.push({
        id: product.id,
        price: baseAdjust(product.price),
        compare_at_price: product.compare_at_price != null ? baseAdjust(product.compare_at_price) : null,
      });
    }

    for (const variant of siblings) {
      if (!variant.metal) continue;
      if (variant.price == null) stats[variant.metal].skippedCount += 1;
      else stats[variant.metal].variantCount += 1;

      const adjust = adjusters[variant.metal];
      if (!adjust || (variant.price == null && variant.compareAt == null)) continue;
      variantRows.push({
        id: variant.id,
        price: variant.price != null ? adjust(variant.price) : null,
        compare_at_price: variant.compareAt != null ? adjust(variant.compareAt) : null,
      });
    }

    // A product that sells in several metals makes the most useful example.
    const priced = new Map();
    for (const variant of siblings) {
      if (variant.metal && variant.price != null && !priced.has(variant.metal)) priced.set(variant.metal, variant);
    }
    if (priced.size > (sample?.variants.length ?? 0)) {
      sample = {
        title: product.title,
        baseMetal: defaultVariant.metal,
        basePrice: Number(product.price),
        baseCompareAt: product.compare_at_price != null ? Number(product.compare_at_price) : null,
        variants: PRICING_METALS.filter((metal) => priced.has(metal.value)).map((metal) => {
          const variant = priced.get(metal.value);
          return {
            metal: metal.value,
            price: Number(variant.price),
            compareAt: variant.compareAt != null ? Number(variant.compareAt) : null,
          };
        }),
      };
    }
  }

  return { stats, variantRows, productRows, sample };
}

// Read-only: how many variants/products each metal rule would touch under this scope, plus
// one sample product so the form can show the before/after prices.
export async function previewMetalPriceAdjustment({ categoryIds = null } = {}) {
  const { stats, sample } = await planMetalAdjustment(categoryIds, {});
  return { metals: stats, sample };
}

// Applies one adjustment per metal in a single transaction. `rules` is the parsed list from
// parseMetalRules ([{ metal, adjustmentValue, adjustmentType, adjustmentDirection }]).
export async function applyMetalPriceAdjustment({ rules, categoryIds = null }) {
  const adjusters = Object.fromEntries(
    rules.map((rule) => [
      rule.metal,
      (price) => calculateAdjustedPrice(price, rule.adjustmentValue, rule.adjustmentType, rule.adjustmentDirection),
    ])
  );

  return withTransaction(async () => {
    const { stats, variantRows, productRows } = await planMetalAdjustment(categoryIds, adjusters);
    const columns = [
      { name: "price", cast: "decimal" },
      { name: "compare_at_price", cast: "decimal" },
    ];
    const updatedProductCount = await bulkUpdateColumns("products", productRows, columns);
    const updatedVariantCount = await bulkUpdateColumns("product_variants", variantRows, columns);
    const skippedVariantCount = rules.reduce((total, rule) => total + stats[rule.metal].skippedCount, 0);
    return { updatedProductCount, updatedVariantCount, skippedVariantCount };
  });
}
