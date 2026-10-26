import { sql, sqlQuery, withTransaction } from "./db";
import { setProductEngravingMode } from "./engraving";
import { normalizeEngravingMode } from "./engravingRules";
import { validateProductPayload, describeProductErrors } from "./shared/product";
import { categoryPathsFromPayload, upsertCategoryPaths, upsertCollections, upsertTags } from "./productTaxonomy";

// Writing products: validate, then store the row and all of its children in one transaction.

// Inserts many rows in a single round trip (one INSERT ... VALUES (...),(...),...)
// instead of one query per row — the sequential-await version of this loop is
// what made saving a product with dozens of variants take a minute or more,
// which in turn is what made an impatient re-click look necessary.
async function batchInsert(table, columns, rows, returning) {
  if (!rows.length) return [];
  const valueGroups = [];
  const params = [];
  let paramIndex = 1;
  for (const row of rows) {
    const placeholders = row.map(() => `$${paramIndex++}`);
    valueGroups.push(`(${placeholders.join(", ")})`);
    params.push(...row);
  }
  const text = `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${valueGroups.join(", ")}${
    returning ? ` RETURNING ${returning}` : ""
  }`;
  return sqlQuery(text, params);
}

const MAX_SKU_LENGTH = 12;

// Carries the HTTP status a route handler should answer with, so expected
// validation failures aren't reported as 500s.
export class ProductError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "ProductError";
    this.status = status;
  }
}

// blob:/data: URLs are browser-local previews; persisting one leaves an image
// that's gone as soon as the tab reloads. Media must be uploaded first.
function isLocalOnlyUrl(url) {
  return /^(blob|data):/i.test(String(url || ""));
}

function assertPersistentMediaUrls(payload) {
  const badMedia = (payload.media || []).filter((m) => !m?.url || isLocalOnlyUrl(m.url));
  const badVariants = (payload.variants || []).filter((v) => v.image && isLocalOnlyUrl(v.image.url));
  if (!badMedia.length && !badVariants.length) return;
  const names = [...badMedia.map((m) => m?.name), ...badVariants.map((v) => v.image.name || v.sku)]
    .filter(Boolean)
    .slice(0, 5);
  throw new ProductError(
    `Some media was never uploaded${names.length ? ` (${names.join(", ")})` : ""}. Remove it and upload it again.`
  );
}

// product_variants.sku is unique *across every product*, not just within one —
// so two products with similar auto-generated codes (e.g. same color/size
// options) can collide even though each product's own variants are internally
// unique. Reassign any SKU that's already taken by another product's variant.
async function dedupeSkusGlobally(variants) {
  const candidates = [...new Set(variants.map((v) => v.sku).filter(Boolean))];
  const taken = new Set(
    candidates.length ? (await sql`SELECT sku FROM product_variants WHERE sku = ANY(${candidates})`).map((r) => r.sku) : []
  );
  if (taken.size === 0) return variants;

  return variants.map((variant) => {
    if (!variant.sku || !taken.has(variant.sku)) {
      if (variant.sku) taken.add(variant.sku);
      return variant;
    }
    let sku = variant.sku;
    let attempt = 0;
    do {
      attempt += 1;
      const suffix = Math.random().toString(36).slice(2, 2 + Math.min(attempt + 1, 4)).toUpperCase();
      sku = variant.sku.slice(0, MAX_SKU_LENGTH - suffix.length) + suffix;
    } while (taken.has(sku) && attempt < 10);
    taken.add(sku);
    return { ...variant, sku };
  });
}

async function replaceChildRows(productId, payload, categoryIds) {
  await sql`DELETE FROM product_categories WHERE product_id = ${productId}`;
  await sql`DELETE FROM product_options WHERE product_id = ${productId}`;
  await sql`DELETE FROM product_media WHERE product_id = ${productId}`;
  await sql`DELETE FROM product_attributes WHERE product_id = ${productId}`;
  await sql`DELETE FROM product_tags WHERE product_id = ${productId}`;
  await sql`DELETE FROM product_collections WHERE product_id = ${productId}`;
  await sql`DELETE FROM product_variants WHERE product_id = ${productId}`;

  if (categoryIds.length) {
    await batchInsert(
      "product_categories",
      ["product_id", "category_id", "position"],
      categoryIds.map((categoryId, i) => [productId, categoryId, i])
    );
  }

  const options = payload.options || [];
  const optionIdByName = {};

  if (options.length) {
    const optionRows = await batchInsert(
      "product_options",
      ["product_id", "name", "position"],
      options.map((o, i) => [productId, o.name, i]),
      "id"
    );
    options.forEach((o, i) => {
      optionIdByName[o.name] = { id: optionRows[i].id, valueIdByValue: {} };
    });

    const valueRowsMeta = [];
    const valueTuples = [];
    options.forEach((o) => {
      o.values.forEach((value, j) => {
        valueTuples.push([optionIdByName[o.name].id, value, j]);
        valueRowsMeta.push({ optionName: o.name, value });
      });
    });

    if (valueTuples.length) {
      const valueRows = await batchInsert(
        "product_option_values",
        ["option_id", "value", "position"],
        valueTuples,
        "id"
      );
      valueRows.forEach((row, i) => {
        const { optionName, value } = valueRowsMeta[i];
        optionIdByName[optionName].valueIdByValue[value] = row.id;
      });
    }
  }

  const media = payload.media || [];
  if (media.length) {
    await batchInsert(
      "product_media",
      ["product_id", "type", "url", "name", "position"],
      media.map((m, i) => [productId, m.type, m.url, m.name || null, i])
    );
  }

  // Freeform admin-defined fields — no predefined labels, just whatever the
  // admin typed. Rows with an empty label are dropped rather than blocking
  // the save (label is NOT NULL on product_attributes).
  const attributes = (payload.attributes || []).filter((a) => a.label && a.label.trim());
  if (attributes.length) {
    await batchInsert(
      "product_attributes",
      ["product_id", "label", "value", "position"],
      attributes.map((a, i) => [productId, a.label.trim(), a.value ?? "", i])
    );
  }

  const tagIds = await upsertTags(payload.tags);
  if (tagIds.length) {
    await batchInsert(
      "product_tags",
      ["product_id", "tag_id"],
      tagIds.map((tagId) => [productId, tagId])
    );
  }

  const collectionIds = await upsertCollections(payload.collections);
  if (collectionIds.length) {
    await batchInsert(
      "product_collections",
      ["product_id", "collection_id"],
      collectionIds.map((collectionId) => [productId, collectionId])
    );
  }

  const variants = payload.variants || [];
  if (variants.length) {
    const dedupedVariants = await dedupeSkusGlobally(variants);
    const variantRows = await batchInsert(
      "product_variants",
      [
        "product_id",
        "sku",
        "price",
        "compare_at_price",
        "inventory_quantity",
        "inventory_management",
        "weight",
        "weight_unit",
        "image_url",
      ],
      dedupedVariants.map((v) => [
        productId,
        v.sku || null,
        v.price || null,
        v.compare_at_price || null,
        v.inventory_quantity || 0,
        v.inventory_management,
        v.weight === "" ? null : v.weight,
        v.weight_unit,
        v.image?.url || null,
      ]),
      "id"
    );

    const linkTuples = [];
    dedupedVariants.forEach((variant, i) => {
      const variantId = variantRows[i].id;
      Object.entries(variant.options || {}).forEach(([optionName, value]) => {
        const valueId = optionIdByName[optionName]?.valueIdByValue?.[value];
        if (valueId) linkTuples.push([variantId, valueId]);
      });
    });

    if (linkTuples.length) {
      await batchInsert("variant_option_values", ["variant_id", "option_value_id"], linkTuples);
    }
  }
}

async function writeProductRow(id, payload, categoryId) {
  const values = {
    title: payload.title,
    handle: payload.handle,
    description: payload.body_html || null,
    category_id: categoryId,
    product_type: payload.product_type || null,
    status: payload.status,
    price: payload.pricing?.price || 0,
    compare_at_price: payload.pricing?.compare_at_price || null,
    cost_per_item: payload.pricing?.cost_per_item || null,
    charge_tax: payload.pricing?.charge_tax ?? true,
    track_quantity: payload.inventory?.track_quantity ?? false,
    sku: payload.inventory?.sku || null,
    barcode: payload.inventory?.barcode || null,
    is_physical_product: payload.shipping?.physical_product ?? true,
    weight: payload.shipping?.weight === "" ? null : payload.shipping?.weight ?? null,
    weight_unit: payload.shipping?.weight_unit || "kg",
    hs_code: payload.shipping?.hs_code || null,
    seo_title: payload.seo?.title || null,
    seo_description: payload.seo?.description || null,
  };

  if (id) {
    try {
      await sql`
        UPDATE products SET
          title = ${values.title}, handle = ${values.handle}, description = ${values.description},
          category_id = ${values.category_id}, product_type = ${values.product_type},
          status = ${values.status}, price = ${values.price}, compare_at_price = ${values.compare_at_price},
          cost_per_item = ${values.cost_per_item}, charge_tax = ${values.charge_tax},
          track_quantity = ${values.track_quantity}, sku = ${values.sku}, barcode = ${values.barcode},
          is_physical_product = ${values.is_physical_product}, weight = ${values.weight},
          weight_unit = ${values.weight_unit}, hs_code = ${values.hs_code},
          seo_title = ${values.seo_title}, seo_description = ${values.seo_description},
          updated_at = now()
        WHERE id = ${id}
      `;
      return id;
    } catch (error) {
      if (error.code === "23505" && error.constraint === "products_handle_key") {
        throw new ProductError(
          `A product with the handle "${values.handle}" already exists. Change the title or handle and try again.`,
          409
        );
      }
      throw error;
    }
  }

  try {
    const [created] = await sql`
      INSERT INTO products (
        title, handle, description, category_id, product_type, status, price, compare_at_price,
        cost_per_item, charge_tax, track_quantity, sku, barcode, is_physical_product, weight,
        weight_unit, hs_code, seo_title, seo_description
      ) VALUES (
        ${values.title}, ${values.handle}, ${values.description}, ${values.category_id},
        ${values.product_type}, ${values.status}, ${values.price}, ${values.compare_at_price},
        ${values.cost_per_item}, ${values.charge_tax}, ${values.track_quantity}, ${values.sku},
        ${values.barcode}, ${values.is_physical_product}, ${values.weight}, ${values.weight_unit},
        ${values.hs_code}, ${values.seo_title}, ${values.seo_description}
      )
      RETURNING id
    `;
    return created.id;
  } catch (error) {
    if (error.code === "23505" && error.constraint === "products_handle_key") {
      throw new ProductError(
        `A product with the handle "${values.handle}" already exists. Change the title or handle and try again.`,
        409
      );
    }
    throw error;
  }
}

// The row and all its children are written in one transaction, so a failure partway
// through (duplicate SKU, bad value, dropped connection) leaves nothing behind: no
// variant-less "ghost" product on create, and no product stripped of its variants,
// media and categories on update.
async function saveProduct(id, payload) {
  const problems = validateProductPayload(payload);
  if (problems.length) throw new ProductError(describeProductErrors(problems), 422);
  assertPersistentMediaUrls(payload);
  // Categories are find-or-create and retry on a slug clash, which a transaction cannot do
  // (a failed INSERT aborts it), so they are settled first; a leftover category is harmless.
  const categoryIds = await upsertCategoryPaths(categoryPathsFromPayload(payload));
  return withTransaction(async () => {
    // products.category_id is the primary (first) category; the rest live in product_categories.
    const productId = await writeProductRow(id, payload, categoryIds[0] ?? null);
    await replaceChildRows(productId, payload, categoryIds);
    await saveEngravingMode(productId, payload);
    return productId;
  });
}

export function createProduct(payload) {
  return saveProduct(null, payload);
}

export function updateProduct(id, payload) {
  return saveProduct(id, payload);
}

// The product's own engraving setting lives beside the aggregate rather than in it. Only
// written when the payload carries one, so imports and scripts that know nothing about
// engraving leave an existing choice alone. Before the engraving migration there is no
// column: "inherit" is what that means, so nothing is stored, and anything else is an error.
// The column is checked up front because a failed UPDATE would abort the save's transaction.
async function saveEngravingMode(id, payload) {
  if (payload.engraving_mode === undefined) return;
  const [column] = await sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'products' AND column_name = 'engraving_mode'
  `;
  if (!column) {
    if (normalizeEngravingMode(payload.engraving_mode) === "inherit") return;
    throw new ProductError("The engraving columns are missing. Run `npm run db:migrate:engraving` and save again.", 503);
  }
  try {
    await setProductEngravingMode(id, payload.engraving_mode);
  } catch (error) {
    throw error.status ? new ProductError(error.message, error.status) : error;
  }
}

export async function deleteProduct(id) {
  await sql`DELETE FROM products WHERE id = ${id}`;
}

// Removes several products in one statement and returns how many existed.
// Dependent rows (variants, media, ...) go with them exactly as in deleteProduct.
export async function deleteProducts(ids) {
  const rows = await sql`DELETE FROM products WHERE id = ANY(${ids}::uuid[]) RETURNING id`;
  return rows.length;
}
