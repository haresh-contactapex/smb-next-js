// Pure cart logic shared by the provider and the drawer sections. Nothing here
// touches the DOM or the network, so it is safe to call during render.

import { engravingKeyPart, sanitizeLineEngraving } from "@/lib/engravingRules";

export const CART_STORAGE_KEY = "smb:cart";
export const NOTE_MAX_LENGTH = 500;
export const MAX_LINE_QUANTITY = 99;

export const EMPTY_CART = { items: [], note: "", coupon: null, shipping: null };

export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

// A line is the product, its variant and its engraving: the same ring engraved two different
// ways is two lines, and the same ring with the same engraving is one. `engraving` is
// { text, fontId } (or null). The server builds the same key from the order request.
export function lineKey(productId, variantId, engraving = null) {
  return `${productId}:${variantId || ""}${engravingKeyPart(engraving)}`;
}

export function cartCount(items) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function cartSubtotal(items) {
  return round2(items.reduce((total, item) => total + item.price * item.quantity, 0));
}

// Upper bound for one line: the variant's tracked stock when it has any.
export function lineLimit(item) {
  return item.maxQuantity > 0 ? Math.min(item.maxQuantity, MAX_LINE_QUANTITY) : MAX_LINE_QUANTITY;
}

export function clampQuantity(quantity, item) {
  return Math.max(1, Math.min(Math.floor(quantity) || 1, lineLimit(item)));
}

// Lines of the same variant that differ only in their engraving draw on one stock count, so a
// line may only take what the variant's other lines leave. Untracked stock has no cap beyond 99.
export function stockLeftForLine(items, line) {
  if (!(line.maxQuantity > 0)) return MAX_LINE_QUANTITY;
  const others = items
    .filter((other) => other.key !== line.key && other.productId === line.productId && other.variantId === line.variantId)
    .reduce((total, other) => total + other.quantity, 0);
  return Math.max(1, Math.min(line.maxQuantity - others, MAX_LINE_QUANTITY));
}

// What a coupon does to the current cart. `amount` is the money taken off,
// `freeShipping` waives the shipping rates, and `shortfall` is how much more
// must be spent before a minimum-purchase code starts to count. `noEligibleItems`
// is set when a category code has nothing in the cart to apply to.
export function couponEffect(coupon, items) {
  const none = { applies: false, amount: 0, freeShipping: false, shortfall: 0, noEligibleItems: false };
  if (!coupon) return none;

  const eligible = coupon.eligibleProductIds
    ? items.filter((item) => coupon.eligibleProductIds.includes(item.productId))
    : items;
  if (eligible.length === 0) return { ...none, noEligibleItems: items.length > 0 };

  const eligibleSubtotal = cartSubtotal(eligible);
  if (coupon.minPurchase && eligibleSubtotal < coupon.minPurchase) {
    return { ...none, shortfall: round2(coupon.minPurchase - eligibleSubtotal) };
  }

  if (coupon.type === "free_shipping") return { ...none, applies: true, freeShipping: true };
  if (coupon.type === "percentage") {
    return { ...none, applies: true, amount: round2((eligibleSubtotal * (coupon.value || 0)) / 100) };
  }
  return { ...none, applies: true, amount: round2(Math.min(coupon.value || 0, eligibleSubtotal)) };
}

// The shipping options for a destination, priced for this cart. The store has
// one flat rate (Settings -> Shipping) that is waived above the free-shipping
// threshold, measured on the subtotal after discounts, or by a free-shipping
// coupon. Local pickup is always free when the store offers it.
export function shippingRates(estimate, discountedSubtotal, freeByCoupon) {
  if (!estimate) return [];
  const freeByThreshold = discountedSubtotal >= estimate.freeShippingThreshold;
  const free = freeByCoupon || freeByThreshold || estimate.flatRate === 0;
  const days = estimate.processingDays;

  const rates = [
    {
      id: "standard",
      label: `${estimate.carrier} Standard`,
      detail: days > 0 ? `Ships within ${days} business ${days === 1 ? "day" : "days"}` : "Ships the same day",
      price: free ? 0 : estimate.flatRate,
    },
  ];
  if (estimate.localPickup) rates.push({ id: "pickup", label: "Local pickup", detail: "Collect from the store", price: 0 });
  return rates;
}

export function cartTotals(cart) {
  const subtotal = cartSubtotal(cart.items);
  const effect = couponEffect(cart.coupon, cart.items);
  const discountedSubtotal = round2(Math.max(0, subtotal - effect.amount));
  const rates = shippingRates(cart.shipping, discountedSubtotal, effect.freeShipping);
  const selectedRate = rates.find((rate) => rate.id === cart.shipping?.selectedRateId) || null;
  const shipping = selectedRate ? selectedRate.price : null;

  return {
    subtotal,
    effect,
    discount: effect.amount,
    discountedSubtotal,
    rates,
    selectedRate,
    shipping,
    total: round2(discountedSubtotal + (shipping || 0)),
  };
}

// --- Changing a line's color / size --------------------------------------------

// The variant of `product` ({ options, variants }) that has the chosen value
// for every option, or undefined when no such combination exists.
export function findVariant(product, selection) {
  return product.variants.find((variant) => product.options.every((option) => variant.options[option.name] === selection[option.name]));
}

// What switching one option of a line does. Changing the color keeps the line's
// size (and vice versa), so a value is only offered when that exact variant
// exists and is in stock; `state` says why not otherwise.
export function optionChoices(product, variant, option) {
  return option.values.map((value) => {
    if (variant.options[option.name] === value) return { value, state: "current", variant };
    const target = findVariant(product, { ...variant.options, [option.name]: value });
    return { value, state: !target ? "unavailable" : target.available ? "ok" : "soldout", variant: target };
  });
}

// --- localStorage round trip -------------------------------------------------

const finiteNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : null);

export function normalizeCartItem(raw) {
  if (!raw || typeof raw !== "object") return null;
  const price = finiteNumber(raw.price);
  const quantity = Math.floor(Number(raw.quantity));
  if (!raw.productId || !raw.title || price === null || price < 0 || !(quantity > 0)) return null;

  // Engraving is optional. Anything stored that isn't a usable { text, fontId } is dropped,
  // so a hand-edited or outdated cart can't carry a half engraving.
  const engraving = sanitizeLineEngraving(raw.engraving);
  const lineEngraving = engraving?.fontId ? engraving : null;

  const item = {
    key: lineKey(raw.productId, raw.variantId, lineEngraving),
    productId: String(raw.productId),
    variantId: raw.variantId ? String(raw.variantId) : null,
    handle: String(raw.handle || ""),
    title: String(raw.title),
    image: raw.image ? String(raw.image) : null,
    options: raw.options && typeof raw.options === "object" ? raw.options : {},
    sku: String(raw.sku || ""),
    price,
    compareAtPrice: finiteNumber(raw.compareAtPrice),
    maxQuantity: finiteNumber(raw.maxQuantity),
    engraving: lineEngraving,
    quantity: 1,
  };
  item.quantity = clampQuantity(quantity, item);
  return item;
}

export function sanitizeCoupon(raw) {
  if (!raw || typeof raw !== "object" || !raw.code || !["percentage", "fixed", "free_shipping"].includes(raw.type)) return null;
  return {
    code: String(raw.code),
    type: raw.type,
    value: finiteNumber(raw.value),
    minPurchase: finiteNumber(raw.minPurchase),
    eligibleProductIds: Array.isArray(raw.eligibleProductIds) ? raw.eligibleProductIds.map(String) : null,
  };
}

export function sanitizeShipping(raw) {
  if (!raw || typeof raw !== "object" || !raw.country) return null;
  return {
    country: String(raw.country),
    zip: String(raw.zip || ""),
    carrier: String(raw.carrier || "Standard"),
    flatRate: finiteNumber(raw.flatRate) ?? 0,
    freeShippingThreshold: finiteNumber(raw.freeShippingThreshold) ?? 0,
    localPickup: Boolean(raw.localPickup),
    processingDays: finiteNumber(raw.processingDays) ?? 0,
    selectedRateId: raw.selectedRateId ? String(raw.selectedRateId) : null,
  };
}

// Anything in storage is untrusted (older versions, hand edits, other tabs),
// so rebuild a clean cart from it rather than using it as is.
export function sanitizeCart(raw) {
  if (!raw || typeof raw !== "object") return EMPTY_CART;
  const seen = new Set();
  const items = (Array.isArray(raw.items) ? raw.items : [])
    .map(normalizeCartItem)
    .filter((item) => item && !seen.has(item.key) && seen.add(item.key));
  return {
    items,
    note: typeof raw.note === "string" ? raw.note.slice(0, NOTE_MAX_LENGTH) : "",
    coupon: sanitizeCoupon(raw.coupon),
    shipping: sanitizeShipping(raw.shipping),
  };
}

export function readStoredCart() {
  try {
    return sanitizeCart(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || "null"));
  } catch {
    return EMPTY_CART;
  }
}
