import { sql, sqlQuery } from "./db";
import { DEFAULT_PRODUCT_SORT, isProductSort } from "./productSort";
import { setProductEngravingMode } from "./engraving";
import { normalizeEngravingMode } from "./engravingRules";

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

export function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Splits a taxonomy path like "Jewelry > Rings > Wedding Bands" into a
// parent/child chain of `categories` rows, reusing any level that already
// exists (by slug or name, scoped to its parent) instead of duplicating it.
export async function upsertCategoryPath(path) {
  const levels = String(path || "")
    .split(">")
    .map((s) => s.trim())
    .filter(Boolean);

  let parentId = null;
  for (const name of levels) {
    const baseSlug = slugify(name);
    // Match by name as well as slug: a level that was created earlier with a
    // disambiguated slug (e.g. "rings-2") must still be found, otherwise every
    // save would try to create it again.
    const [existing] = parentId
      ? await sql`
          SELECT id FROM categories
          WHERE (slug = ${baseSlug} OR lower(name) = lower(${name})) AND parent_id = ${parentId}
          ORDER BY created_at LIMIT 1`
      : await sql`
          SELECT id FROM categories
          WHERE (slug = ${baseSlug} OR lower(name) = lower(${name})) AND parent_id IS NULL
          ORDER BY created_at LIMIT 1`;

    if (existing) {
      parentId = existing.id;
      continue;
    }

    // categories.slug is unique *globally*, not just within a parent, so a
    // same-named category that already exists under a different parent (e.g.
    // "Wedding Bands" at the top level and again under Jewelry > Rings) needs
    // a disambiguated slug rather than failing the whole save.
    let slug = baseSlug;
    let created = null;
    let attempt = 0;
    while (!created) {
      try {
        const rows = await sql`
          INSERT INTO categories (name, slug, parent_id)
          VALUES (${name}, ${slug}, ${parentId})
          RETURNING id
        `;
        created = rows[0];
      } catch (error) {
        if (error.code === "23505" && error.constraint === "categories_slug_key" && attempt < 5) {
          attempt += 1;
          slug = `${baseSlug}-${attempt + 1}`;
          continue;
        }
        throw error;
      }
    }
    parentId = created.id;
  }

  return parentId;
}

// The category paths a save should store, in order, without blanks or repeats.
// The form sends `categories` (every chip) next to the primary `category`;
// CSV import and older clients send only `category`, which counts as one.
function categoryPathsFromPayload(payload) {
  const raw = Array.isArray(payload.categories) && payload.categories.length ? payload.categories : [payload.category];
  const seen = new Set();
  const paths = [];
  for (const entry of raw) {
    const path = String(entry || "")
      .split(">")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" > ");
    const key = path.toLowerCase();
    if (!path || seen.has(key)) continue;
    seen.add(key);
    paths.push(path);
  }
  return paths;
}

// Resolves each path to its category row, one at a time so paths that share a
// parent don't race to create it. Two paths can land on the same row (a level
// matched by name rather than slug), hence the id de-dupe.
async function upsertCategoryPaths(paths) {
  const ids = [];
  for (const path of paths) {
    const id = await upsertCategoryPath(path);
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

export async function upsertTags(names) {
  const ids = [];
  for (const name of names || []) {
    if (!name) continue;
    const [existing] = await sql`SELECT id FROM tags WHERE name = ${name}`;
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const [created] = await sql`INSERT INTO tags (name) VALUES (${name}) RETURNING id`;
    ids.push(created.id);
  }
  return ids;
}

export async function upsertCollections(names) {
  const ids = [];
  for (const name of names || []) {
    if (!name) continue;
    const [existing] = await sql`SELECT id FROM collections WHERE name = ${name}`;
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const [created] = await sql`
      INSERT INTO collections (name, slug) VALUES (${name}, ${slugify(name)}) RETURNING id
    `;
    ids.push(created.id);
  }
  return ids;
}

function categoryPathFromRow(row) {
  const parts = [];
  let current = row;
  while (current) {
    parts.unshift(current.name);
    current = current.parent;
  }
  return parts.join(" > ");
}

export async function listProducts() {
  const rows = await sql`
    SELECT
      p.id,
      p.title,
      p.sku,
      p.handle,
      p.status,
      p.price,
      p.compare_at_price,
      p.inventory_quantity,
      c.name AS category_name,
      COALESCE(ac.names, ARRAY[]::text[]) AS category_names,
      COALESCE(v.variant_qty, p.inventory_quantity, 0) AS inventory,
      m.url AS thumbnail
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    -- Every category the product belongs to (primary + product_categories), for the list filter.
    LEFT JOIN LATERAL (
      SELECT ARRAY_AGG(DISTINCT cc.name) AS names
      FROM categories cc
      WHERE cc.id = p.category_id
         OR cc.id IN (SELECT pc.category_id FROM product_categories pc WHERE pc.product_id = p.id)
    ) ac ON true
    -- The main image: the first image in the product's media order. blob:
    -- URLs are dead local previews saved before uploads existed, so they're
    -- skipped rather than shown as a broken thumbnail.
    LEFT JOIN LATERAL (
      SELECT url FROM product_media
      WHERE product_id = p.id AND type = 'image' AND url NOT LIKE 'blob:%'
      ORDER BY position
      LIMIT 1
    ) m ON true
    LEFT JOIN (
      SELECT product_id, SUM(inventory_quantity) AS variant_qty
      FROM product_variants
      GROUP BY product_id
    ) v ON v.product_id = p.id
    ORDER BY p.created_at DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    handle: row.handle,
    sku: row.sku || "",
    category: row.category_name || "Uncategorized",
    categories: row.category_names?.length ? row.category_names : ["Uncategorized"],
    price: Number(row.price) || 0,
    compareAtPrice: row.compare_at_price ? Number(row.compare_at_price) : null,
    inventory: Number(row.inventory) || 0,
    status: row.status.charAt(0) + row.status.slice(1).toLowerCase(),
    thumbnail: row.thumbnail || null,
  }));
}

// Lightweight lookup for the header's product search dropdown — title/SKU
// match plus a single thumbnail, not the full listProducts() listing shape.
export async function searchProducts(query, limit = 8) {
  const like = `%${query}%`;
  const rows = await sql`
    SELECT
      p.id,
      p.title,
      p.sku,
      p.status,
      p.price,
      p.compare_at_price,
      m.url AS thumbnail
    FROM products p
    LEFT JOIN LATERAL (
      SELECT url FROM product_media WHERE product_id = p.id ORDER BY position LIMIT 1
    ) m ON true
    WHERE p.title ILIKE ${like} OR p.sku ILIKE ${like}
    ORDER BY p.created_at DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    sku: row.sku || "",
    price: Number(row.price) || 0,
    compareAtPrice: row.compare_at_price ? Number(row.compare_at_price) : null,
    status: row.status.charAt(0) + row.status.slice(1).toLowerCase(),
    thumbnail: row.thumbnail || null,
  }));
}

export async function getProductById(id) {
  const [product] = await sql`SELECT * FROM products WHERE id = ${id}`;
  if (!product) return null;

  // Each of the product's categories with its ancestors, as "Parent > Child"
  // paths: the primary one (products.category_id) first, then the rest of
  // product_categories in the order the admin added them. products.category_id
  // is always trusted, because imports and scripts set it without knowing
  // about product_categories; the position -1 sorts it ahead of the join rows
  // and DISTINCT ON keeps a category that is in both from appearing twice.
  const categoryChains = await sql`
    WITH RECURSIVE membership AS (
      SELECT DISTINCT ON (category_id) category_id, position FROM (
        SELECT ${product.category_id}::uuid AS category_id, -1 AS position
        WHERE ${product.category_id}::uuid IS NOT NULL
        UNION ALL
        SELECT category_id, position::int FROM product_categories WHERE product_id = ${id}
      ) all_memberships
      ORDER BY category_id, position
    ),
    ancestry AS (
      SELECT m.category_id AS leaf_id, m.position, c.id, c.name, c.parent_id, 0 AS depth
      FROM membership m
      JOIN categories c ON c.id = m.category_id
      UNION ALL
      SELECT a.leaf_id, a.position, c.id, c.name, c.parent_id, a.depth + 1
      FROM categories c
      JOIN ancestry a ON c.id = a.parent_id
    )
    SELECT leaf_id, position, name FROM ancestry ORDER BY position, leaf_id, depth DESC
  `;
  const categoryPaths = [];
  const namesByLeaf = new Map();
  for (const row of categoryChains) {
    if (!namesByLeaf.has(row.leaf_id)) {
      namesByLeaf.set(row.leaf_id, []);
      categoryPaths.push(namesByLeaf.get(row.leaf_id));
    }
    namesByLeaf.get(row.leaf_id).push(row.name);
  }
  const categories = categoryPaths.map((names) => names.join(" > "));

  const options = await sql`
    SELECT id, name FROM product_options WHERE product_id = ${id} ORDER BY position
  `;
  const optionValues = await sql`
    SELECT ov.id, ov.option_id, ov.value
    FROM product_option_values ov
    JOIN product_options o ON o.id = ov.option_id
    WHERE o.product_id = ${id}
    ORDER BY ov.position
  `;

  const variants = await sql`
    SELECT * FROM product_variants WHERE product_id = ${id} ORDER BY created_at
  `;
  const variantOptionValues = await sql`
    SELECT vov.variant_id, ov.option_id, o.name AS option_name, ov.value
    FROM variant_option_values vov
    JOIN product_option_values ov ON ov.id = vov.option_value_id
    JOIN product_options o ON o.id = ov.option_id
    WHERE vov.variant_id IN (SELECT id FROM product_variants WHERE product_id = ${id})
    ORDER BY o.position
  `;

  const media = await sql`
    SELECT type, url, name FROM product_media WHERE product_id = ${id} ORDER BY position
  `;

  const attributes = await sql`
    SELECT id, label, value FROM product_attributes WHERE product_id = ${id} ORDER BY position
  `;

  const tags = await sql`
    SELECT t.name FROM tags t
    JOIN product_tags pt ON pt.tag_id = t.id
    WHERE pt.product_id = ${id}
  `;

  const collections = await sql`
    SELECT c.name FROM collections c
    JOIN product_collections pc ON pc.collection_id = c.id
    WHERE pc.product_id = ${id}
  `;

  return {
    id: product.id,
    title: product.title,
    body_html: product.description || "",
    product_type: product.product_type || "",
    category: categories[0] || "",
    categories,
    collections: collections.map((c) => c.name),
    tags: tags.map((t) => t.name),
    handle: product.handle,
    status: product.status,
    // "inherit" (follow the engraving categories), "enabled" or "disabled"; see lib/engraving.js.
    engraving_mode: normalizeEngravingMode(product.engraving_mode),
    price: product.price !== null ? String(product.price) : "",
    compare_at_price: product.compare_at_price !== null ? String(product.compare_at_price) : "",
    charge_tax: product.charge_tax,
    cost_per_item: product.cost_per_item !== null ? String(product.cost_per_item) : "",
    track_quantity: product.track_quantity,
    sku: product.sku || "",
    barcode: product.barcode || "",
    physical_product: product.is_physical_product,
    weight: product.weight !== null ? String(product.weight) : "",
    weight_unit: product.weight_unit,
    hs_code: product.hs_code || "",
    options: options.map((o) => ({
      id: o.id,
      name: o.name,
      values: optionValues.filter((v) => v.option_id === o.id).map((v) => v.value),
    })),
    variantDefaults: null,
    seo: { title: product.seo_title || "", description: product.seo_description || "" },
    attributes: attributes.map((a) => ({ id: a.id, label: a.label, value: a.value })),
    media: media.map((m) => ({ type: m.type, url: m.url, name: m.name })),
    variants: variants.map((v) => ({
      id: v.id,
      options: Object.fromEntries(
        variantOptionValues.filter((vv) => vv.variant_id === v.id).map((vv) => [vv.option_name, vv.value])
      ),
      price: v.price !== null ? String(v.price) : "",
      compare_at_price: v.compare_at_price !== null ? String(v.compare_at_price) : "",
      sku: v.sku || "",
      inventory_quantity: v.inventory_quantity,
      inventory_management: v.inventory_management,
      weight: v.weight !== null ? String(v.weight) : "",
      weight_unit: v.weight_unit,
      image: v.image_url ? { url: v.image_url, name: null } : null,
    })),
  };
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
    track_quantity: payload.inventory?.track_quantity ?? true,
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

export async function createProduct(payload) {
  assertPersistentMediaUrls(payload);
  const categoryIds = await upsertCategoryPaths(categoryPathsFromPayload(payload));
  // products.category_id is the primary (first) category; the rest live in product_categories.
  const id = await writeProductRow(null, payload, categoryIds[0] ?? null);
  try {
    await replaceChildRows(id, payload, categoryIds);
    await saveEngravingMode(id, payload);
  } catch (error) {
    // The HTTP driver can't wrap this in a real transaction (each statement
    // is its own request), so if the children fail partway through, delete
    // the product row we just created instead of leaving a variant-less
    // "ghost" product behind — that's exactly the "error shown, but it saved
    // anyway" symptom this whole fix pass is about.
    await sql`DELETE FROM products WHERE id = ${id}`.catch(() => {});
    throw error;
  }
  return id;
}

export async function updateProduct(id, payload) {
  assertPersistentMediaUrls(payload);
  const categoryIds = await upsertCategoryPaths(categoryPathsFromPayload(payload));
  await writeProductRow(id, payload, categoryIds[0] ?? null);
  await replaceChildRows(id, payload, categoryIds);
  await saveEngravingMode(id, payload);
  return id;
}

// The product's own engraving setting lives beside the aggregate rather than in it. Only
// written when the payload carries one, so imports and scripts that know nothing about
// engraving leave an existing choice alone.
async function saveEngravingMode(id, payload) {
  if (payload.engraving_mode === undefined) return;
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

// A product's metal color and band size are its variant options, found by option name
// (the same rule the product page uses to draw swatches).
const COLOR_OPTION_PATTERN = "colou?r|metal";
const SIZE_OPTION_PATTERN = "size";

// Listing filters arrive as the option values a shopper picked; matching ignores case.
// An empty selection means "no filter" (null), which the queries skip.
function optionFilters({ metals, size }) {
  const lower = (list) => {
    const values = [...new Set((list || []).map((value) => String(value ?? "").trim().toLowerCase()).filter(Boolean))];
    return values.length ? values : null;
  };
  return { metalValues: lower(metals), sizeValues: lower(size ? [size] : []) };
}

// Storefront listing: only ACTIVE products, with the first two images (main +
// hover) from the product's media order. blob: URLs are skipped as above.
// `hasVariants` tells a card whether it can add the product straight to the cart
// (a simple product) or must send the shopper to the product page to choose.
//
// `limit` null returns every match. `sort` is one of PRODUCT_SORTS (src/lib/productSort.js);
// each order ends with newest first, then id, which keeps it stable when products share a
// created_at, so offset paging never skips or repeats one.
async function queryStorefrontProducts({ limit = null, offset = 0, minPrice = null, maxPrice = null, categorySlug = null, metals = null, size = null, sort = DEFAULT_PRODUCT_SORT } = {}) {
  const { metalValues, sizeValues } = optionFilters({ metals, size });
  // Only a known sort reaches the query; anything else falls back to the default order.
  const order = isProductSort(sort) ? sort : DEFAULT_PRODUCT_SORT;
  const rows = await sql`
    SELECT
      p.id,
      p.title,
      p.handle,
      p.sku,
      p.price,
      p.compare_at_price,
      EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id) AS has_variants,
      (
        SELECT ARRAY_AGG(url ORDER BY position) FROM (
          SELECT url, position FROM product_media
          WHERE product_id = p.id AND type = 'image' AND url NOT LIKE 'blob:%'
          ORDER BY position
          LIMIT 2
        ) images
      ) AS images
    FROM products p
    WHERE p.status = 'ACTIVE'
      AND (${minPrice}::numeric IS NULL OR p.price >= ${minPrice}::numeric)
      AND (${maxPrice}::numeric IS NULL OR p.price <= ${maxPrice}::numeric)
      AND (${categorySlug}::text IS NULL OR p.id IN (
        WITH RECURSIVE tree AS (
          SELECT id FROM categories WHERE slug = ${categorySlug}
          UNION ALL
          SELECT ch.id FROM categories ch JOIN tree t ON ch.parent_id = t.id
        )
        SELECT pc.product_id FROM product_categories pc JOIN tree ON pc.category_id = tree.id
        UNION
        SELECT p2.id FROM products p2 JOIN tree ON p2.category_id = tree.id
      ))
      AND (${metalValues}::text[] IS NULL OR EXISTS (
        SELECT 1 FROM product_options o JOIN product_option_values ov ON ov.option_id = o.id
        WHERE o.product_id = p.id AND o.name ~* ${COLOR_OPTION_PATTERN}::text AND LOWER(ov.value) = ANY(${metalValues}::text[])
      ))
      AND (${sizeValues}::text[] IS NULL OR EXISTS (
        SELECT 1 FROM product_options o JOIN product_option_values ov ON ov.option_id = o.id
        WHERE o.product_id = p.id AND o.name ~* ${SIZE_OPTION_PATTERN}::text AND LOWER(ov.value) = ANY(${sizeValues}::text[])
      ))
    ORDER BY
      CASE WHEN ${order}::text = 'price-asc' THEN p.price END ASC NULLS LAST,
      CASE WHEN ${order}::text = 'price-desc' THEN p.price END DESC NULLS LAST,
      CASE WHEN ${order}::text = 'title-asc' THEN LOWER(p.title) END ASC NULLS LAST,
      CASE WHEN ${order}::text = 'title-desc' THEN LOWER(p.title) END DESC NULLS LAST,
      CASE WHEN ${order}::text = 'date-asc' THEN p.created_at END ASC NULLS LAST,
      CASE WHEN ${order}::text = 'bestselling' THEN (
        SELECT COALESCE(SUM(li.quantity), 0) FROM order_line_items li
        JOIN orders o ON o.id = li.order_id
        WHERE li.product_id = p.id AND o.status <> 'Cancelled'
      ) END DESC NULLS LAST,
      CASE WHEN ${order}::text = 'relevance' THEN (
        SELECT COUNT(DISTINCT LOWER(ov.value)) FROM product_options o JOIN product_option_values ov ON ov.option_id = o.id
        WHERE o.product_id = p.id AND o.name ~* ${COLOR_OPTION_PATTERN}::text AND LOWER(ov.value) = ANY(${metalValues}::text[])
      ) END DESC NULLS LAST,
      p.created_at DESC, p.id
    LIMIT ${limit}::int OFFSET ${offset}::int
  `;

  return rows.map(toStorefrontCard);
}

// One listing / search row shaped for a storefront product card.
function toStorefrontCard(row) {
  return {
    id: row.id,
    handle: row.handle,
    title: row.title,
    sku: row.sku || "",
    price: Number(row.price) || 0,
    compareAtPrice: moneyOrNull(row.compare_at_price),
    hasVariants: Boolean(row.has_variants),
    image: row.images?.[0] || null,
    hoverImage: row.images?.[1] || row.images?.[0] || null,
  };
}

export async function listStorefrontProducts() {
  return queryStorefrontProducts();
}

// One representative photo per category for the storefront mega menus: the newest
// ACTIVE product in the category (or its sub-categories) that has an image, or
// null when there is none or the slug is unknown. Keyed by the requested slugs.
export async function listCategoryPreviewImages(slugs) {
  const entries = await Promise.all(
    slugs.map(async (slug) => {
      // A few candidates, in case the newest ones have no image.
      const products = await queryStorefrontProducts({ limit: 5, categorySlug: slug });
      return [slug, products.find((product) => product.image)?.image || null];
    }),
  );
  return Object.fromEntries(entries);
}

export const STOREFRONT_PAGE_SIZE = 12;
export const STOREFRONT_MAX_PAGE_SIZE = 48;

// One page of the storefront listing for "Load more": the products plus the
// total number matching the price filter, so the shopper sees "12 of 60" and
// the button disappears after the last page.
export async function listStorefrontProductsPage({ limit = STOREFRONT_PAGE_SIZE, offset = 0, minPrice = null, maxPrice = null, categorySlug = null, metals = null, size = null, sort = DEFAULT_PRODUCT_SORT } = {}) {
  const pageSize = Math.min(Math.max(Math.floor(limit) || STOREFRONT_PAGE_SIZE, 1), STOREFRONT_MAX_PAGE_SIZE);
  const start = Math.max(Math.floor(offset) || 0, 0);
  const { metalValues, sizeValues } = optionFilters({ metals, size });

  const [products, [{ total }]] = await Promise.all([
    queryStorefrontProducts({ limit: pageSize, offset: start, minPrice, maxPrice, categorySlug, metals, size, sort }),
    sql`
      SELECT COUNT(*)::int AS total FROM products p
      WHERE p.status = 'ACTIVE'
        AND (${minPrice}::numeric IS NULL OR p.price >= ${minPrice}::numeric)
        AND (${maxPrice}::numeric IS NULL OR p.price <= ${maxPrice}::numeric)
        AND (${categorySlug}::text IS NULL OR p.id IN (
          WITH RECURSIVE tree AS (
            SELECT id FROM categories WHERE slug = ${categorySlug}
            UNION ALL
            SELECT ch.id FROM categories ch JOIN tree t ON ch.parent_id = t.id
          )
          SELECT pc.product_id FROM product_categories pc JOIN tree ON pc.category_id = tree.id
          UNION
          SELECT p2.id FROM products p2 JOIN tree ON p2.category_id = tree.id
        ))
        AND (${metalValues}::text[] IS NULL OR EXISTS (
          SELECT 1 FROM product_options o JOIN product_option_values ov ON ov.option_id = o.id
          WHERE o.product_id = p.id AND o.name ~* ${COLOR_OPTION_PATTERN}::text AND LOWER(ov.value) = ANY(${metalValues}::text[])
        ))
        AND (${sizeValues}::text[] IS NULL OR EXISTS (
          SELECT 1 FROM product_options o JOIN product_option_values ov ON ov.option_id = o.id
          WHERE o.product_id = p.id AND o.name ~* ${SIZE_OPTION_PATTERN}::text AND LOWER(ov.value) = ANY(${sizeValues}::text[])
        ))
    `,
  ]);

  return { products, total, hasMore: start + products.length < total };
}

// The metal colors and band sizes the listing filter offers: every value of a color/metal
// or size option on an ACTIVE product in the listing (the category and its sub-categories,
// or the whole shop). Values that differ only by case count once. Sizes sort as numbers.
export async function listStorefrontFilterOptions({ categorySlug = null } = {}) {
  const rows = await sql`
    SELECT o.name AS option_name, ov.value
    FROM product_options o
    JOIN product_option_values ov ON ov.option_id = o.id
    JOIN products p ON p.id = o.product_id
    WHERE p.status = 'ACTIVE'
      AND (o.name ~* ${COLOR_OPTION_PATTERN}::text OR o.name ~* ${SIZE_OPTION_PATTERN}::text)
      AND (${categorySlug}::text IS NULL OR p.id IN (
        WITH RECURSIVE tree AS (
          SELECT id FROM categories WHERE slug = ${categorySlug}
          UNION ALL
          SELECT ch.id FROM categories ch JOIN tree t ON ch.parent_id = t.id
        )
        SELECT pc.product_id FROM product_categories pc JOIN tree ON pc.category_id = tree.id
        UNION
        SELECT p2.id FROM products p2 JOIN tree ON p2.category_id = tree.id
      ))
    GROUP BY o.name, ov.value
  `;

  const colorRule = new RegExp(COLOR_OPTION_PATTERN, "i");
  const sizeRule = new RegExp(SIZE_OPTION_PATTERN, "i");
  const unique = (matches) => {
    const byKey = new Map();
    for (const row of rows) {
      const value = String(row.value ?? "").trim();
      if (value && matches(row.option_name) && !byKey.has(value.toLowerCase())) byKey.set(value.toLowerCase(), value);
    }
    return [...byKey.values()].sort((a, b) => a.localeCompare(b, "en", { numeric: true, sensitivity: "base" }));
  };

  return {
    metals: unique((name) => colorRule.test(name)),
    sizes: unique((name) => sizeRule.test(name) && !colorRule.test(name)),
  };
}

export const STOREFRONT_SEARCH_MAX_LENGTH = 100;
const SEARCH_MAX_TERMS = 8;

// Characters that mean something inside a LIKE pattern are matched literally.
const escapeLike = (text) => text.replace(/[\\%_]/g, "\\$&");

// Cleans up what the shopper typed: whitespace collapsed, length capped, and the
// words split out (each wrapped as a contains-pattern). Empty text has no terms.
export function parseStorefrontSearch(raw) {
  const phrase = String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, STOREFRONT_SEARCH_MAX_LENGTH).trim();
  const words = [...new Set(phrase.toLowerCase().split(" ").filter(Boolean))].slice(0, SEARCH_MAX_TERMS);
  return { phrase, terms: words.map((word) => `%${escapeLike(word)}%`) };
}

// Storefront search: ACTIVE products where every word typed appears somewhere in
// the title, SKU (product or variant), type, vendor, category or description.
// Best matches come first: the exact title, a title that starts with the text,
// one with a word starting with it ("ring" in "Twisted Ring" before "Earrings"),
// one that contains it, then one holding every word, then the rest by newest.
// Pages with limit/offset like the listing; `total` counts all matches.
export async function searchStorefrontProducts({ query, limit = 8, offset = 0 } = {}) {
  const { phrase, terms } = parseStorefrontSearch(query);
  const pageSize = Math.min(Math.max(Math.floor(limit) || 8, 1), STOREFRONT_MAX_PAGE_SIZE);
  const start = Math.max(Math.floor(offset) || 0, 0);
  if (terms.length === 0) return { query: phrase, products: [], total: 0, hasMore: false };

  const lowered = phrase.toLowerCase();
  const rows = await sql`
    SELECT
      p.id,
      p.title,
      p.handle,
      p.sku,
      p.price,
      p.compare_at_price,
      EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id) AS has_variants,
      (
        SELECT ARRAY_AGG(url ORDER BY position) FROM (
          SELECT url, position FROM product_media
          WHERE product_id = p.id AND type = 'image' AND url NOT LIKE 'blob:%'
          ORDER BY position
          LIMIT 2
        ) images
      ) AS images,
      COUNT(*) OVER ()::int AS total
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.status = 'ACTIVE'
      AND NOT EXISTS (
        SELECT 1 FROM unnest(${terms}::text[]) AS t(pattern)
        WHERE NOT (
          concat_ws(' ', p.title, p.sku, p.product_type, p.vendor, c.name, p.description) ILIKE t.pattern
          OR EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id AND v.sku ILIKE t.pattern)
        )
      )
    ORDER BY
      CASE
        WHEN lower(p.title) = ${lowered} THEN 0
        WHEN p.title ILIKE ${`${escapeLike(phrase)}%`} THEN 1
        WHEN p.title ILIKE ${`% ${escapeLike(phrase)}%`} THEN 2
        WHEN p.title ILIKE ${`%${escapeLike(phrase)}%`} THEN 3
        WHEN NOT EXISTS (SELECT 1 FROM unnest(${terms}::text[]) AS t(pattern) WHERE p.title NOT ILIKE t.pattern) THEN 4
        ELSE 5
      END,
      p.created_at DESC,
      p.id
    LIMIT ${pageSize}::int OFFSET ${start}::int
  `;

  const total = rows[0]?.total ?? 0;
  return { query: phrase, products: rows.map(toStorefrontCard), total, hasMore: start + rows.length < total };
}

function moneyOrNull(value) {
  return value === null || value === undefined ? null : Number(value);
}

// Rows arrive as flat (name, value) pairs already ordered by option/value position.
function groupOptions(rows) {
  const options = [];
  for (const { name, value } of rows) {
    let option = options.find((o) => o.name === name);
    if (!option) options.push((option = { name, values: [] }));
    option.values.push(value);
  }
  return options;
}

// A variant's own photo, or null when it has none. blob: URLs are dead local
// previews, like in the product media above, so they are skipped. Queries that
// don't select image_url simply yield null.
function variantImageUrl(value) {
  return typeof value === "string" && value && !value.startsWith("blob:") ? value : null;
}

// Variant prices fall back to the product's, and `available` keeps the
// inventory rules out of the storefront components.
function toStorefrontVariant(row, productPrice, productCompareAtPrice) {
  return {
    id: row.id,
    sku: row.sku || "",
    imageUrl: variantImageUrl(row.image_url),
    options: row.options,
    price: moneyOrNull(row.price) ?? productPrice,
    compareAtPrice: moneyOrNull(row.compare_at_price) ?? productCompareAtPrice,
    available: !row.inventory_management || row.inventory_quantity > 0,
    // Units on hand when stock is tracked, so the cart can cap the quantity; null means unlimited.
    maxQuantity: row.inventory_management ? Math.max(0, Number(row.inventory_quantity) || 0) : null,
  };
}

// The category trail for a product page's breadcrumb, root first: the first of
// the product's categories (products.category_id, then product_categories in the
// admin's order) that has a visible category, with its visible ancestors.
// Hidden categories are left out because their collection pages 404. A product
// with no category, or only hidden ones, gets an empty trail.
async function getStorefrontCategoryTrail(productId, primaryCategoryId) {
  const rows = await sql`
    WITH RECURSIVE membership AS (
      SELECT DISTINCT ON (category_id) category_id, position FROM (
        SELECT ${primaryCategoryId}::uuid AS category_id, -1 AS position
        WHERE ${primaryCategoryId}::uuid IS NOT NULL
        UNION ALL
        SELECT category_id, position::int FROM product_categories WHERE product_id = ${productId}
      ) all_memberships
      ORDER BY category_id, position
    ),
    ancestry AS (
      SELECT m.category_id AS leaf_id, m.position, c.id, c.name, c.slug, c.parent_id, c.is_visible, 0 AS depth
      FROM membership m
      JOIN categories c ON c.id = m.category_id
      UNION ALL
      SELECT a.leaf_id, a.position, c.id, c.name, c.slug, c.parent_id, c.is_visible, a.depth + 1
      FROM categories c
      JOIN ancestry a ON c.id = a.parent_id
      WHERE a.depth < 10
    )
    SELECT leaf_id, name, slug, is_visible FROM ancestry ORDER BY position, leaf_id, depth DESC
  `;

  // Rows arrive grouped per category, in membership order, ancestors first.
  const trails = new Map();
  for (const row of rows) {
    if (!trails.has(row.leaf_id)) trails.set(row.leaf_id, []);
    if (row.is_visible) trails.get(row.leaf_id).push({ name: row.name, slug: row.slug });
  }
  for (const trail of trails.values()) {
    if (trail.length) return trail;
  }
  return [];
}

// Storefront product page: one ACTIVE product by handle, shaped for display.
// Draft/archived products and unknown handles return null (the page 404s).
// Variant prices fall back to the product price, and each variant carries an
// `available` flag so the page never has to interpret inventory rules itself.
// `includeDraft` is for the staff preview only: it also finds DRAFT products.
export async function getStorefrontProductByHandle(handle, { includeDraft = false } = {}) {
  const [product] = await sql`
    SELECT id, title, handle, status, description, price, compare_at_price, sku, seo_title, seo_description, category_id
    FROM products
    WHERE handle = ${handle} AND (status = 'ACTIVE' OR (${includeDraft}::boolean AND status = 'DRAFT'))
  `;
  if (!product) return null;

  const [media, attributes, optionRows, variantRows, categoryTrail] = await Promise.all([
    sql`
      SELECT url FROM product_media
      WHERE product_id = ${product.id} AND type = 'image' AND url NOT LIKE 'blob:%'
      ORDER BY position
    `,
    sql`SELECT label, value FROM product_attributes WHERE product_id = ${product.id} ORDER BY position`,
    sql`
      SELECT o.name, ov.value
      FROM product_options o
      JOIN product_option_values ov ON ov.option_id = o.id
      WHERE o.product_id = ${product.id}
      ORDER BY o.position, ov.position
    `,
    sql`
      SELECT
        v.id, v.sku, v.price, v.compare_at_price, v.inventory_quantity, v.inventory_management, v.image_url,
        COALESCE(json_object_agg(o.name, ov.value ORDER BY o.position) FILTER (WHERE o.name IS NOT NULL), '{}'::json) AS options
      FROM product_variants v
      LEFT JOIN variant_option_values vov ON vov.variant_id = v.id
      LEFT JOIN product_option_values ov ON ov.id = vov.option_value_id
      LEFT JOIN product_options o ON o.id = ov.option_id
      WHERE v.product_id = ${product.id}
      GROUP BY v.id
      ORDER BY v.created_at, v.id
    `,
    getStorefrontCategoryTrail(product.id, product.category_id),
  ]);

  const price = Number(product.price) || 0;
  const compareAtPrice = moneyOrNull(product.compare_at_price);

  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    status: product.status,
    categoryTrail,
    description: product.description || "",
    seoTitle: product.seo_title || "",
    seoDescription: product.seo_description || "",
    sku: product.sku || "",
    price,
    compareAtPrice,
    images: media.map((m) => m.url),
    attributes: attributes.map((a) => ({ label: a.label, value: a.value })),
    options: groupOptions(optionRows),
    variants: variantRows.map((v) => toStorefrontVariant(v, price, compareAtPrice)),
  };
}

// The color/size pickers on the cart page: the option lists and variants of
// the given ACTIVE products, in the same shape the product page uses. Products
// that are missing or no longer active are simply left out.
export async function listStorefrontProductVariants(productIds) {
  if (productIds.length === 0) return [];

  const [products, optionRows, variantRows] = await Promise.all([
    sql`
      SELECT id, price, compare_at_price FROM products
      WHERE id = ANY(${productIds}::uuid[]) AND status = 'ACTIVE'
    `,
    sql`
      SELECT o.product_id, o.name, ov.value
      FROM product_options o
      JOIN product_option_values ov ON ov.option_id = o.id
      WHERE o.product_id = ANY(${productIds}::uuid[])
      ORDER BY o.position, ov.position
    `,
    sql`
      SELECT
        v.id, v.product_id, v.sku, v.price, v.compare_at_price, v.inventory_quantity, v.inventory_management,
        COALESCE(json_object_agg(o.name, ov.value ORDER BY o.position) FILTER (WHERE o.name IS NOT NULL), '{}'::json) AS options
      FROM product_variants v
      LEFT JOIN variant_option_values vov ON vov.variant_id = v.id
      LEFT JOIN product_option_values ov ON ov.id = vov.option_value_id
      LEFT JOIN product_options o ON o.id = ov.option_id
      WHERE v.product_id = ANY(${productIds}::uuid[])
      GROUP BY v.id
      ORDER BY v.created_at
    `,
  ]);

  return products.map((product) => {
    const price = Number(product.price) || 0;
    const compareAtPrice = moneyOrNull(product.compare_at_price);
    return {
      id: product.id,
      options: groupOptions(optionRows.filter((row) => row.product_id === product.id)),
      variants: variantRows
        .filter((row) => row.product_id === product.id)
        .map((row) => toStorefrontVariant(row, price, compareAtPrice)),
    };
  });
}

// What the checkout needs to price a cart from the database instead of trusting
// the browser: for each ACTIVE product its title, SKU, price and stock, plus its
// variants (with their own price and stock, in the same shape the product page
// uses). `stock` is the units on hand for a product without variants, or null when
// stock isn't tracked. Missing, draft and archived products are simply left out.
export async function listCheckoutProducts(productIds) {
  if (productIds.length === 0) return [];

  const [products, withVariants] = await Promise.all([
    sql`
      SELECT id, title, handle, sku, price, track_quantity, inventory_quantity
      FROM products
      WHERE id = ANY(${productIds}::uuid[]) AND status = 'ACTIVE'
    `,
    listStorefrontProductVariants(productIds),
  ]);

  return products.map((product) => {
    const tracked = product.track_quantity && product.inventory_quantity !== null;
    return {
      id: product.id,
      title: product.title,
      handle: product.handle,
      sku: product.sku || "",
      price: Number(product.price) || 0,
      stock: tracked ? Math.max(0, Number(product.inventory_quantity) || 0) : null,
      variants: withVariants.find((candidate) => candidate.id === product.id)?.variants || [],
    };
  });
}
