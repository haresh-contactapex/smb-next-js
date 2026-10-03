import { listCheckoutProducts } from "./products";
import { CartError, listShippingCountries, lookupCartCoupon, lookupShippingRules } from "./storefrontCart";
import { loadCheckoutPricingSettings } from "./storefrontCheckout";
import { formatCurrency } from "./currency";
import { validateUsLocation } from "./usAddress";
// Pure cart arithmetic (coupons, shipping rates, totals) and the checkout's form
// validation. Both are shared with the browser on purpose: the server must reach the
// same totals the customer was shown, and prices and discounts are never taken from
// the request.
import { cartTotals, lineKey, round2 } from "@/components/storefront/cart/cartHelpers";
import { PHONE_COUNTRIES, checkoutTotals, phoneCountryOf, validateAddress, validateContact } from "@/components/storefront/checkout/checkoutHelpers";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LINES = 50;
const MAX_QUANTITY = 99;
const PRICE_TOLERANCE = 0.005;

// A problem the visitor can act on. `reason` tells the checkout what to do about it
// ("cart_changed" refreshes the cart, "coupon_invalid" drops the code, ...) and
// `details` carries what it needs to do that.
export class CheckoutError extends Error {
  constructor(message, status = 400, { reason = null, details = null } = {}) {
    super(message);
    this.status = status;
    this.reason = reason;
    this.details = details;
  }
}

const text = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");

function parseItems(raw) {
  if (!Array.isArray(raw) || raw.length === 0) throw new CheckoutError("Your cart is empty.");
  if (raw.length > MAX_LINES) throw new CheckoutError("There are too many items in your cart.");

  const seen = new Set();
  return raw.map((item) => {
    const productId = typeof item?.productId === "string" ? item.productId : "";
    const variantId = item?.variantId ? String(item.variantId) : null;
    const quantity = Number(item?.quantity);
    const price = Number(item?.price);
    if (!UUID_PATTERN.test(productId) || (variantId !== null && !UUID_PATTERN.test(variantId))) {
      throw new CheckoutError("An item in your cart isn't valid. Please review your cart.");
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) throw new CheckoutError("An item in your cart has an invalid quantity.");
    if (!Number.isFinite(price) || price < 0) throw new CheckoutError("An item in your cart has an invalid price.");

    const key = lineKey(productId, variantId);
    if (seen.has(key)) throw new CheckoutError("The same item is in your cart twice. Please review your cart.");
    seen.add(key);
    return { key, productId, variantId, quantity, shownPrice: price };
  });
}

function parseContact(raw) {
  const contact = {
    firstName: text(raw?.firstName, 60),
    lastName: text(raw?.lastName, 60),
    email: text(raw?.email, 120),
    phoneCountry: text(raw?.phoneCountry, 2),
    phone: text(raw?.phone, 30),
    updates: false,
  };
  const errors = validateContact(contact);
  const [field] = Object.keys(errors);
  if (field) throw new CheckoutError(errors[field], 400, { reason: "invalid_contact", details: { field } });

  // E.164-style digits ("+15551234567"), which fits the 20-character phone columns.
  const phoneE164 = `${phoneCountryOf(contact.phoneCountry).dial}${contact.phone.replace(/\D/g, "")}`.slice(0, 20);
  return { ...contact, phoneE164 };
}

// A billing or shipping address, validated exactly as the form does (the state and
// city must exist in the country, the postal code must belong to the city) and
// rewritten with the state and city spelled canonically.
function parseAddress(raw, section, countries) {
  const address = {
    country: text(raw?.country, 60),
    line1: text(raw?.line1, 120),
    line2: text(raw?.line2, 120),
    city: text(raw?.city, 80),
    state: text(raw?.state, 80),
    zip: text(raw?.zip, 12),
  };
  const { errors, place } = validateAddress(address, countries);
  const [field] = Object.keys(errors);
  if (field) {
    throw new CheckoutError(`Check your ${section} address: ${errors[field]}`, 400, { reason: "invalid_address", details: { section, field } });
  }
  // A US address must also exist: the ZIP must be real and belong to the state and city.
  const usLocation = validateUsLocation({ country: address.country, state: place.state, city: place.city, postalCode: address.zip });
  if (!usLocation.valid) {
    throw new CheckoutError(`Check your ${section} address: ${usLocation.message}`, 400, { reason: "invalid_address", details: { section, field: usLocation.field } });
  }
  return { ...address, state: place.state, city: usLocation.city || place.city };
}

// Prices every line from the database. Anything the customer can't buy as asked
// (gone, out of stock, fewer in stock than wanted) or whose price differs from the one
// they saw makes the whole request fail with "cart_changed" and the current truth for
// every line, so the cart can bring itself up to date before the customer decides again.
async function priceLines(items, currency, moneyFormat) {
  const products = await listCheckoutProducts([...new Set(items.map((item) => item.productId))]);

  const lines = [];
  const report = [];
  const problems = [];

  for (const item of items) {
    const product = products.find((candidate) => candidate.id === item.productId);
    const variant = product && product.variants.length > 0 ? product.variants.find((candidate) => candidate.id === item.variantId) : null;
    const purchasable = Boolean(product) && (product.variants.length === 0 ? item.variantId === null : Boolean(variant));

    if (!purchasable) {
      report.push({ key: item.key, found: false, available: false, price: item.shownPrice, maxQuantity: null });
      problems.push("An item in your cart is no longer available.");
      continue;
    }

    const price = variant ? variant.price : product.price;
    const maxQuantity = variant ? variant.maxQuantity : product.stock;
    const available = variant ? variant.available : product.stock === null || product.stock > 0;
    report.push({ key: item.key, found: true, available, price, maxQuantity });

    if (!available) problems.push(`${product.title} is out of stock.`);
    else if (maxQuantity !== null && item.quantity > maxQuantity) problems.push(`Only ${maxQuantity} of ${product.title} ${maxQuantity === 1 ? "is" : "are"} in stock.`);
    else if (Math.abs(price - item.shownPrice) > PRICE_TOLERANCE) {
      problems.push(`The price of ${product.title} changed from ${formatCurrency(item.shownPrice, currency, moneyFormat)} to ${formatCurrency(price, currency, moneyFormat)}.`);
    }

    const options = variant ? Object.values(variant.options || {}).filter(Boolean) : [];
    lines.push({
      productId: product.id,
      variantId: variant ? variant.id : null,
      handle: product.handle,
      title: options.length > 0 ? `${product.title} (${options.join(", ")})` : product.title,
      sku: (variant ? variant.sku : product.sku) || "",
      unitPrice: price,
      quantity: item.quantity,
      lineTotal: round2(price * item.quantity),
    });
  }

  if (problems.length > 0) {
    throw new CheckoutError(`${problems[0]} We've updated your cart, so please review it.`, 409, { reason: "cart_changed", details: { lines: report } });
  }
  return lines;
}

// The whole order, priced and validated from the database and the store's settings.
// `input` is the checkout's request: what to buy and for whom, plus the total the
// customer was shown (`expectedTotal`), which must still be right.
export async function priceCheckout(input) {
  const items = parseItems(input?.items);
  const countries = listShippingCountries();
  const contact = parseContact(input?.contact);
  const billing = parseAddress(input?.billing, "billing", countries);
  const shipping = input?.sameAsBilling ? billing : parseAddress(input?.shipping, "shipping", countries);

  const { currency, moneyFormat, tax } = await loadCheckoutPricingSettings();
  const lines = await priceLines(items, currency, moneyFormat);

  // The code is checked against the store's coupons again. A code that has expired or run
  // out since it was applied fails the order rather than silently changing the total.
  let coupon = null;
  const couponCode = text(input?.couponCode, 30);
  if (couponCode) {
    try {
      coupon = await lookupCartCoupon(couponCode, lines.map((line) => line.productId));
    } catch (error) {
      if (!(error instanceof CartError)) throw error;
      throw new CheckoutError(`${error.message} The discount code was removed from your order.`, 409, { reason: "coupon_invalid", details: { couponCode } });
    }
  }

  // The shipping rules for the shipping address, which the server validates once more.
  let estimate;
  try {
    estimate = await lookupShippingRules(shipping.country, shipping.zip, shipping.state, shipping.city);
  } catch (error) {
    if (!(error instanceof CartError)) throw error;
    throw new CheckoutError(`Check your shipping address: ${error.message}`, 400, { reason: "invalid_address", details: { section: "shipping", field: error.field || "zip" } });
  }

  const rateId = text(input?.shippingRateId, 20) || "standard";
  const totals = cartTotals({
    items: lines.map((line) => ({ productId: line.productId, price: line.unitPrice, quantity: line.quantity })),
    coupon,
    shipping: { ...estimate, selectedRateId: rateId },
  });
  if (!totals.selectedRate) throw new CheckoutError("That shipping option isn't available. Please choose another.", 400, { reason: "invalid_shipping" });

  const priced = checkoutTotals(totals, tax);
  const expected = Number(input?.expectedTotal);
  if (!Number.isFinite(expected) || Math.abs(expected - priced.total) > PRICE_TOLERANCE) {
    throw new CheckoutError(
      `Your order total is now ${formatCurrency(priced.total, currency, moneyFormat)}. We've refreshed the page, so please review it and try again.`,
      409,
      { reason: "total_changed", details: { total: priced.total } }
    );
  }

  return {
    currency,
    contact,
    billing,
    shipping,
    sameAsBilling: Boolean(input?.sameAsBilling),
    lines,
    couponCode: totals.effect.applies ? coupon.code : null,
    subtotal: totals.subtotal,
    discount: totals.discount,
    shippingAmount: totals.selectedRate.price,
    shippingLabel: totals.selectedRate.label,
    // null when prices already include tax: nothing was added on top.
    tax: priced.tax,
    total: priced.total,
  };
}

// Stripe wants two-letter country codes; the store's address forms use country names.
export function countryCode(name) {
  return PHONE_COUNTRIES.find((country) => country.name === name)?.code || null;
}
