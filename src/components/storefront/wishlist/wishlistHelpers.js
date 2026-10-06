// Pure wishlist logic plus the guest list's localStorage round trip. A wishlist
// entry is only a reference (product + optional variant); everything displayed
// about it is looked up live, so nothing here can go stale.

export const WISHLIST_STORAGE_KEY = "smb:wishlist";
export const MAX_WISHLIST_ITEMS = 100;

export function wishlistKey(productId, variantId) {
  return `${productId}:${variantId || ""}`;
}

export function normalizeWishlistItem(raw) {
  if (!raw || typeof raw !== "object" || !raw.productId) return null;
  const productId = String(raw.productId);
  const variantId = raw.variantId ? String(raw.variantId) : null;
  return { key: wishlistKey(productId, variantId), productId, variantId };
}

// Anything in storage (or from the server) is rebuilt rather than trusted: bad
// entries and repeats are dropped and the list is capped.
export function sanitizeWishlist(raw) {
  const seen = new Set();
  return (Array.isArray(raw) ? raw : [])
    .map(normalizeWishlistItem)
    .filter((item) => item && !seen.has(item.key) && seen.add(item.key))
    .slice(0, MAX_WISHLIST_ITEMS);
}

// The product's variants in its own option order (first color, then first
// size, ...). The order variants come back from the database in is not
// reliable (variants created together tie on created_at, and the tie breaks
// differently depending on which other products are in the same query), so
// anything that needs a predictable order should use this one.
export function variantsInOptionOrder(product) {
  const rank = (variant) => product.options.map((option) => Math.max(0, option.values.indexOf(variant.options[option.name])));
  return [...product.variants].sort((a, b) => {
    const rankA = rank(a);
    const rankB = rank(b);
    for (let i = 0; i < rankA.length; i += 1) {
      if (rankA[i] !== rankB[i]) return rankA[i] - rankB[i];
    }
    return 0;
  });
}

// The variant a card shows for an item saved without a color/size: the first
// purchasable one in the product's own option order.
export function defaultVariant(product) {
  const ordered = variantsInOptionOrder(product);
  return ordered.find((variant) => variant.available) || ordered[0] || null;
}

// Asks the shopper before something comes off the wishlist, so a stray tap can't
// drop it. The browser's confirm box, like the app's other removals. `name` is
// the product's title in quotes, or a generic phrase when there is no title to show.
export function confirmWishlistRemoval(name) {
  return window.confirm(`Remove ${name} from your wishlist?`);
}

export function readStoredWishlist() {
  try {
    return sanitizeWishlist(JSON.parse(window.localStorage.getItem(WISHLIST_STORAGE_KEY) || "[]"));
  } catch {
    return [];
  }
}

export function writeStoredWishlist(items) {
  try {
    const serialized = JSON.stringify(items.map(({ productId, variantId }) => ({ productId, variantId })));
    if (window.localStorage.getItem(WISHLIST_STORAGE_KEY) !== serialized) window.localStorage.setItem(WISHLIST_STORAGE_KEY, serialized);
  } catch {
    // Storage full or blocked (private mode): the list still works for this page view.
  }
}

export function clearStoredWishlist() {
  try {
    window.localStorage.removeItem(WISHLIST_STORAGE_KEY);
  } catch {
    // Nothing to clear if storage is blocked.
  }
}
