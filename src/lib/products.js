import { sql, sqlQuery } from "./db";

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

const MAX_SKU_LENGTH = 10;

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

function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Splits a taxonomy path like "Jewelry > Rings > Wedding Bands" into a
// parent/child chain of `categories` rows, reusing any level that already
// exists (by slug, scoped to its parent) instead of duplicating it.
export async function upsertCategoryPath(path) {
  const levels = String(path || "")
    .split(">")
    .map((s) => s.trim())
    .filter(Boolean);

  let parentId = null;
  for (const name of levels) {
    const slug = slugify(name);
    const [existing] = parentId
      ? await sql`SELECT id FROM categories WHERE slug = ${slug} AND parent_id = ${parentId}`
      : await sql`SELECT id FROM categories WHERE slug = ${slug} AND parent_id IS NULL`;

    if (existing) {
      parentId = existing.id;
      continue;
    }

    const [created] = await sql`
      INSERT INTO categories (name, slug, parent_id)
      VALUES (${name}, ${slug}, ${parentId})
      RETURNING id
    `;
    parentId = created.id;
  }

  return parentId;
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
      COALESCE(v.variant_qty, p.inventory_quantity, 0) AS inventory
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
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
    sku: row.sku || "",
    category: row.category_name || "Uncategorized",
    price: Number(row.price) || 0,
    compareAtPrice: row.compare_at_price ? Number(row.compare_at_price) : null,
    inventory: Number(row.inventory) || 0,
    status: row.status.charAt(0) + row.status.slice(1).toLowerCase(),
  }));
}

export async function getProductById(id) {
  const [product] = await sql`SELECT * FROM products WHERE id = ${id}`;
  if (!product) return null;

  let categoryPath = "";
  if (product.category_id) {
    const chain = await sql`
      WITH RECURSIVE ancestry AS (
        SELECT id, name, parent_id, 0 AS depth FROM categories WHERE id = ${product.category_id}
        UNION ALL
        SELECT c.id, c.name, c.parent_id, a.depth + 1
        FROM categories c
        JOIN ancestry a ON c.id = a.parent_id
      )
      SELECT name FROM ancestry ORDER BY depth DESC
    `;
    categoryPath = chain.map((r) => r.name).join(" > ");
  }

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
  `;

  const media = await sql`
    SELECT type, url, name FROM product_media WHERE product_id = ${id} ORDER BY position
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
    category: categoryPath,
    collections: collections.map((c) => c.name),
    tags: tags.map((t) => t.name),
    handle: product.handle,
    status: product.status,
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
    })),
  };
}

async function replaceChildRows(productId, payload) {
  await sql`DELETE FROM product_options WHERE product_id = ${productId}`;
  await sql`DELETE FROM product_media WHERE product_id = ${productId}`;
  await sql`DELETE FROM product_tags WHERE product_id = ${productId}`;
  await sql`DELETE FROM product_collections WHERE product_id = ${productId}`;
  await sql`DELETE FROM product_variants WHERE product_id = ${productId}`;

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
      ["product_id", "type", "url", "name"],
      media.map((m) => [productId, m.type, m.url, m.name || null])
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
        throw new Error(
          `A product with the handle "${values.handle}" already exists. Change the title or handle and try again.`
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
      throw new Error(
        `A product with the handle "${values.handle}" already exists. Change the title or handle and try again.`
      );
    }
    throw error;
  }
}

export async function createProduct(payload) {
  const categoryId = await upsertCategoryPath(payload.category);
  const id = await writeProductRow(null, payload, categoryId);
  try {
    await replaceChildRows(id, payload);
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
  const categoryId = await upsertCategoryPath(payload.category);
  await writeProductRow(id, payload, categoryId);
  await replaceChildRows(id, payload);
  return id;
}

export async function deleteProduct(id) {
  await sql`DELETE FROM products WHERE id = ${id}`;
}
