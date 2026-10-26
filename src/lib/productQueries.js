import { sql } from "./db";
import { normalizeEngravingMode } from "./engravingRules";

// Reading products for the admin: the list, the search box and the edit form's full aggregate.

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
      (v.product_id IS NOT NULL AND NOT v.tracked) AS untracked,
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
      SELECT product_id, SUM(inventory_quantity) FILTER (WHERE inventory_management) AS variant_qty,
        BOOL_OR(inventory_management) AS tracked
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
    // null: stock is not tracked, so the product is always available.
    inventory: row.untracked ? null : Number(row.inventory) || 0,
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
