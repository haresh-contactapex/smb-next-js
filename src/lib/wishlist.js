import { sql } from "./db";
import { listStorefrontProductVariants } from "./products";

// Server side of the storefront wishlist. A signed-in customer's list lives in
// wishlist_items; a guest's list stays in the browser and is merged in at
// sign-in. Entries are references (product, optional variant) only: titles,
// prices and stock are always read live so a saved item never goes stale.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const MAX_WISHLIST_ITEMS = 100;

// Thrown for problems the visitor can understand; route handlers turn `status` into the HTTP status.
export class WishlistError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const isUuid = (value) => typeof value === "string" && UUID_PATTERN.test(value);

// Validates one { productId, variantId } reference from a request body. A
// missing/null variant means "the product, no color or size chosen".
export function parseWishlistRef(raw) {
  const productId = raw?.productId;
  const variantId = raw?.variantId ?? null;
  if (!isUuid(productId)) throw new WishlistError("Choose a valid product.");
  if (variantId !== null && !isUuid(variantId)) throw new WishlistError("Choose a valid color or size.");
  return { productId, variantId };
}

// A list of references from the browser (a guest's saved items), dropping
// anything malformed or repeated rather than failing the whole merge.
export function parseWishlistRefs(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const refs = [];
  for (const entry of raw) {
    let ref;
    try {
      ref = parseWishlistRef(entry);
    } catch {
      continue;
    }
    const key = `${ref.productId}:${ref.variantId || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push(ref);
    if (refs.length >= MAX_WISHLIST_ITEMS) break;
  }
  return refs;
}

export function parseProductIds(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter(isUuid))].slice(0, MAX_WISHLIST_ITEMS);
}

// Only ACTIVE products can be saved, and a variant must belong to its product.
async function assertSaveable({ productId, variantId }) {
  const [row] = variantId
    ? await sql`
        SELECT 1 AS ok FROM product_variants v
        JOIN products p ON p.id = v.product_id
        WHERE v.id = ${variantId} AND v.product_id = ${productId} AND p.status = 'ACTIVE'
      `
    : await sql`SELECT 1 AS ok FROM products WHERE id = ${productId} AND status = 'ACTIVE'`;
  if (!row) throw new WishlistError("That product is no longer available.", 404);
}

// Newest first.
export async function listWishlist(customerId) {
  const rows = await sql`
    SELECT product_id, variant_id FROM wishlist_items
    WHERE customer_id = ${customerId}
    ORDER BY created_at DESC, id
  `;
  return rows.map((row) => ({ productId: row.product_id, variantId: row.variant_id }));
}

// Saving something already saved succeeds without changing anything.
export async function addWishlistItem(customerId, ref) {
  await assertSaveable(ref);
  const inserted = await sql`
    INSERT INTO wishlist_items (customer_id, product_id, variant_id)
    SELECT ${customerId}::uuid, ${ref.productId}::uuid, ${ref.variantId}::uuid
    WHERE (SELECT COUNT(*) FROM wishlist_items WHERE customer_id = ${customerId}) < ${MAX_WISHLIST_ITEMS}
    ON CONFLICT DO NOTHING
    RETURNING id
  `;
  if (inserted.length > 0) return;

  // Nothing inserted: either it was already saved, or the list is full.
  const [existing] = await sql`
    SELECT 1 AS ok FROM wishlist_items
    WHERE customer_id = ${customerId} AND product_id = ${ref.productId} AND variant_id IS NOT DISTINCT FROM ${ref.variantId}::uuid
  `;
  if (!existing) throw new WishlistError(`Your wishlist is full (${MAX_WISHLIST_ITEMS} items). Remove something to save more.`, 409);
}

export async function removeWishlistItem(customerId, { productId, variantId }) {
  await sql`
    DELETE FROM wishlist_items
    WHERE customer_id = ${customerId} AND product_id = ${productId} AND variant_id IS NOT DISTINCT FROM ${variantId}::uuid
  `;
}

// Every saved variant of a product, for the heart on a listing card.
export async function removeWishlistProduct(customerId, productId) {
  await sql`DELETE FROM wishlist_items WHERE customer_id = ${customerId} AND product_id = ${productId}`;
}

// Switches a saved entry to another color/size of the same product. If the
// target is already saved the two entries simply become one.
export async function replaceWishlistVariant(customerId, { productId, variantId }, toVariantId) {
  if (!isUuid(toVariantId)) throw new WishlistError("Choose a valid color or size.");
  if (toVariantId === variantId) return;
  await assertSaveable({ productId, variantId: toVariantId });
  await sql`
    INSERT INTO wishlist_items (customer_id, product_id, variant_id)
    VALUES (${customerId}, ${productId}, ${toVariantId})
    ON CONFLICT DO NOTHING
  `;
  await removeWishlistItem(customerId, { productId, variantId });
}

// Adds a guest's saved items to the customer's list. Items that are gone from
// the catalog, already saved, or past the list limit are skipped; the full
// resulting list is returned.
export async function mergeWishlistItems(customerId, refs) {
  const existing = await listWishlist(customerId);
  const savedKeys = new Set(existing.map((item) => `${item.productId}:${item.variantId || ""}`));
  const savedProducts = new Set(existing.map((item) => item.productId));

  const room = MAX_WISHLIST_ITEMS - existing.length;
  const fresh = refs.filter((ref) => !savedKeys.has(`${ref.productId}:${ref.variantId || ""}`)).slice(0, Math.max(0, room));

  // A product saved without a color/size is redundant next to any saved entry for it.
  const variantRefs = fresh.filter((ref) => ref.variantId);
  const variantIds = variantRefs.map((ref) => ref.variantId);
  const coveredProducts = new Set([...savedProducts, ...variantRefs.map((ref) => ref.productId)]);
  const productIds = fresh.filter((ref) => !ref.variantId && !coveredProducts.has(ref.productId)).map((ref) => ref.productId);

  if (variantIds.length > 0) {
    // The product comes from the variant itself, never from the request.
    await sql`
      INSERT INTO wishlist_items (customer_id, product_id, variant_id)
      SELECT ${customerId}::uuid, v.product_id, v.id
      FROM product_variants v
      JOIN products p ON p.id = v.product_id AND p.status = 'ACTIVE'
      WHERE v.id = ANY(${variantIds}::uuid[])
      ON CONFLICT DO NOTHING
    `;
  }
  if (productIds.length > 0) {
    await sql`
      INSERT INTO wishlist_items (customer_id, product_id, variant_id)
      SELECT ${customerId}::uuid, p.id, NULL::uuid
      FROM products p
      WHERE p.id = ANY(${productIds}::uuid[]) AND p.status = 'ACTIVE'
      ON CONFLICT DO NOTHING
    `;
  }

  return listWishlist(customerId);
}

function moneyOrNull(value) {
  return value === null || value === undefined ? null : Number(value);
}

// What the wishlist page shows for each saved product: display fields, the
// approved-review rating, and the option lists / variants (with stock) behind
// the color and size pickers. Public catalog data only; products that are
// missing or no longer ACTIVE are left out, which the page reports as
// "no longer available".
export async function getWishlistProducts(productIds) {
  if (productIds.length === 0) return [];

  const [products, media, ratings, variantData] = await Promise.all([
    sql`
      SELECT id, title, handle, sku, price, compare_at_price
      FROM products
      WHERE id = ANY(${productIds}::uuid[]) AND status = 'ACTIVE'
    `,
    sql`
      SELECT DISTINCT ON (product_id) product_id, url
      FROM product_media
      WHERE product_id = ANY(${productIds}::uuid[]) AND type = 'image' AND url NOT LIKE 'blob:%'
      ORDER BY product_id, position
    `,
    // Reviews are an extra: a store that hasn't set them up still gets a wishlist.
    sql`
      SELECT product_id, COUNT(*) AS count, AVG(rating) AS average
      FROM product_reviews
      WHERE product_id = ANY(${productIds}::uuid[]) AND status = 'APPROVED'
      GROUP BY product_id
    `.catch(() => []),
    listStorefrontProductVariants(productIds),
  ]);

  return products.map((product) => {
    const rating = ratings.find((row) => row.product_id === product.id);
    const catalog = variantData.find((entry) => entry.id === product.id);
    return {
      id: product.id,
      handle: product.handle,
      title: product.title,
      sku: product.sku || "",
      image: media.find((row) => row.product_id === product.id)?.url || null,
      price: Number(product.price) || 0,
      compareAtPrice: moneyOrNull(product.compare_at_price),
      rating: { average: Number(rating?.average) || 0, count: Number(rating?.count) || 0 },
      options: catalog?.options || [],
      variants: catalog?.variants || [],
    };
  });
}
