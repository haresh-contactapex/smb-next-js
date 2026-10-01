import { sql } from "./db";
import { getCouponByCode } from "./coupons";
import { getShippingSettings } from "./shippingSettings";
import { listStorefrontProductVariants } from "./products";
import { LOCATIONS } from "@/data/locationData";
import { validateTypedLocation } from "./validateAddress";

// Server side of the storefront cart drawer. The cart itself lives in the
// visitor's browser; these helpers only answer the two questions it can't:
// "is this discount code valid?" and "what are the shipping rules for here?".
// Both return the rule, and the drawer applies it to the live cart so the
// totals update as items change without another round trip.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CART_PRODUCTS = 100;

// Thrown for problems the visitor can fix; route handlers turn `status` into the HTTP status.
// `field` names the form field at fault ("state", "city", "zip", ...) when there is one.
export class CartError extends Error {
  constructor(message, status = 400, field = null) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

// Same normalization as couponValues() in coupons.js, so a code typed in any
// case or with stray spaces/dashes matches what the admin saved.
function normalizeCouponCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 20);
}

function parseProductIds(value) {
  if (!Array.isArray(value)) return [];
  const ids = value.filter((id) => typeof id === "string" && UUID_PATTERN.test(id));
  return [...new Set(ids)].slice(0, MAX_CART_PRODUCTS);
}

// Which of the given products sit in the category or any of its sub-categories.
async function productsInCategoryTree(categoryId, productIds) {
  if (!categoryId || productIds.length === 0) return [];
  const rows = await sql`
    WITH RECURSIVE tree AS (
      SELECT id FROM categories WHERE id = ${categoryId}
      UNION
      SELECT c.id FROM categories c JOIN tree t ON c.parent_id = t.id
    )
    SELECT p.id FROM products p
    WHERE p.id = ANY(${productIds}::uuid[]) AND p.category_id IN (SELECT id FROM tree)
  `;
  return rows.map((row) => row.id);
}

// Validates a discount code for a cart holding `productIds` and returns the
// rule to apply. `eligibleProductIds` is null when the code covers everything.
export async function lookupCartCoupon(rawCode, rawProductIds) {
  const code = normalizeCouponCode(rawCode);
  if (!code) throw new CartError("Enter a discount code.");

  const coupon = await getCouponByCode(code);
  if (!coupon || coupon.status === "SCHEDULED" || coupon.status === "DRAFT") {
    throw new CartError("That discount code isn't valid.");
  }
  if (coupon.status === "EXPIRED") throw new CartError("That discount code has expired.");
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    throw new CartError("That discount code has reached its usage limit.");
  }

  let eligibleProductIds = null;
  if (coupon.appliesTo === "CATEGORY") {
    eligibleProductIds = await productsInCategoryTree(coupon.categoryId, parseProductIds(rawProductIds));
    if (eligibleProductIds.length === 0) {
      throw new CartError(
        coupon.categoryName
          ? `That discount code only applies to ${coupon.categoryName} items.`
          : "That discount code doesn't apply to the items in your cart."
      );
    }
  }

  return {
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    minPurchase: coupon.minPurchase,
    eligibleProductIds,
  };
}

// The option lists and variants of the products in a cart, so the cart page
// can offer the other colors and sizes of each line.
export async function lookupCartProducts(rawProductIds) {
  const productIds = parseProductIds(rawProductIds);
  if (productIds.length === 0) throw new CartError("There are no products to look up.");
  return listStorefrontProductVariants(productIds);
}

// Countries offered in the estimator, with how their postal code is labelled.
// The regexes in locationData stay on the server; the client only needs to
// know the label and whether a code is required.
export function listShippingCountries() {
  return Object.entries(LOCATIONS).map(([name, country]) => ({
    name,
    postalLabel: country.postalLabel,
    postalRequired: Boolean(country.postalFormat),
  }));
}

// Validates the destination and returns the store's shipping rules. Settings ->
// Shipping has a single flat rate for every destination (no zones yet), so the
// destination only needs to be real; it doesn't change the price.
//
// The cart's estimator sends just a country and postal code, which are checked
// for format. The checkout also sends the state and city the visitor typed, and
// then the whole location has to agree (country -> state -> city -> postal code),
// as the account address forms require; the typed names match regardless of case.
export async function lookupShippingRules(rawCountry, rawZip, rawState, rawCity) {
  const countryName = String(rawCountry || "").trim();
  const country = LOCATIONS[countryName];
  if (!country) throw new CartError("Select a country to estimate shipping.", 400, "country");

  const zip = String(rawZip || "").trim().slice(0, 12);
  if (rawState !== undefined || rawCity !== undefined) {
    const location = validateTypedLocation({ country: countryName, state: rawState, city: rawCity, postalCode: zip });
    if (!location.valid) throw new CartError(location.message, 400, location.field);
  } else if (country.postalFormat) {
    if (!country.postalFormat.test(zip)) throw new CartError(`Enter ${country.postalHint} for ${countryName}.`, 400, "zip");
  }

  const settings = await getShippingSettings();
  return {
    country: countryName,
    zip,
    carrier: settings.defaultCarrier,
    flatRate: Number(settings.flatRateFee) || 0,
    freeShippingThreshold: Number(settings.freeShippingThreshold) || 0,
    localPickup: settings.localPickupEnabled,
    processingDays: Number(settings.processingTimeDays) || 0,
  };
}
