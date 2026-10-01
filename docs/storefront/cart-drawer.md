# Storefront cart drawer

The public storefront cart: **Add To Cart** on the product page, the item count
on the header cart icon, and a drawer that slides in from the right.

There is no cart table. The cart lives in the visitor's browser and two public
endpoints answer the questions the browser can't.

## Where things live

| Piece | Path |
| --- | --- |
| Cart state, `localStorage` persistence, `useCart()` | `src/components/storefront/cart/CartProvider.js` |
| Pure pricing/sanitizing logic (coupon, shipping, totals) | `src/components/storefront/cart/cartHelpers.js` |
| Drawer, line items | `CartDrawer.js`, `CartLine.js` |
| Icon row + the section each icon opens (shared by drawer and cart page) | `CartOptions.js` → `CartNote.js`, `CartShipping.js`, `CartCoupon.js` |
| Totals and the (disabled) Checkout button, shared | `CartTotals.js`, `CartCheckoutButton.js` |
| Full cart page at `/cart` | `src/app/(site)/cart/page.js`, `CartPage.js` |
| Header icon + count badge | `CartButton.js` |
| Server lookups | `src/lib/storefrontCart.js`, `getCouponByCode()` in `src/lib/coupons.js` |
| Public endpoints | `src/app/api/cart/coupon/route.js`, `src/app/api/cart/shipping/route.js` |

`CartProvider` and `CartDrawer` are mounted once in `src/app/(site)/layout.js`.

## Behavior

- **Add To Cart** adds the selected variant (or the plain product) and opens the
  drawer. The same variant merges into one line; a different variant is a new
  line. Quantity is capped at the variant's tracked stock (`maxQuantity`, null
  when stock isn't tracked) and at 99.
- The cart is stored under `localStorage["smb:cart"]` as
  `{ items, note, coupon, shipping }` and syncs between tabs. Stored data is
  rebuilt through `sanitizeCart()` on every read. Removing the last line resets
  the note, code and shipping estimate too.
- Three icons under the item list each reveal one section (one at a time):
  - **Order note** – free text, up to 500 characters, saved with the cart.
  - **Shipping** – pick a country and postal code, then choose a rate.
  - **Coupon** – enter a code from *Vouchers / Coupons*.
- Under the totals the drawer has **View Cart** (opens `/cart`) above
  **Checkout**. `/cart` shows the same lines, options and totals as a full page.
- Not included on purpose: a "spend X for free shipping" progress bar and a
  "I agree to the Terms & conditions" checkbox.
- **Checkout is disabled.** Checkout isn't built on the storefront yet (Buy Now
  is inert for the same reason).

## Endpoints

Both are `POST`, unauthenticated (storefront visitors), and use the standard
`{ success, data }` / `{ success: false, error }` envelope.

`/api/cart/coupon` – body `{ code, productIds }`. The code is normalized the same
way the admin saves it. Returns the rule only: `{ code, type, value, minPurchase,
eligibleProductIds }`. Rejected (400) when the code is unknown or not yet
started, expired, or past its usage limit, or when a category code matches no
product in the cart. `eligibleProductIds` is `null` for store-wide codes;
category codes include products in sub-categories. The coupon's internal
description and usage counters are never returned.

`/api/cart/shipping` – body `{ country, zip }`. Country must be one of
`src/data/locationData.js`; the postal code is checked against that country's
format. Returns the Settings → Shipping values: `{ carrier, flatRate,
freeShippingThreshold, localPickup, processingDays }`.

The browser applies those rules to the live cart (`couponEffect()`,
`shippingRates()` in `cartHelpers.js`), so totals update without another request:

- Percentage / fixed discounts apply to the eligible lines; a minimum purchase is
  measured on the eligible subtotal, and the drawer says how much more to spend.
- Free-shipping codes waive the flat rate. The flat rate is also waived when the
  subtotal after discounts reaches the free-shipping threshold. Local pickup is
  always free when enabled.
- A saved code is re-checked against the server whenever the set of products in
  the cart changes and on each page load; it is removed with a message if it has
  expired or run out.

## Not enforced yet

Prices in the cart are the ones shown when the item was added, and `one_per_customer`
/ `usage_count` aren't touched. Checkout must re-price the cart from the database
and record the redemption; nothing in the cart should be trusted as an order total.
