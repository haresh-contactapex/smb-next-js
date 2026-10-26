import { sql } from "./db";
import { DEFAULT_PRODUCT_SORT, isProductSort } from "./productSort";

// Read side of the catalog: what the public storefront lists, searches and prices.
// The admin write side (create/update/delete, categories, tags) lives in products.js,
// which re-exports everything here so existing imports keep working.

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
