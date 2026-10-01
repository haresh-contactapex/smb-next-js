# Storefront checkout

The public checkout page at `/checkout`, reached from **Checkout** in the cart
drawer and **Proceed to checkout** on the cart page. It collects contact and
address details and shows the order summary. **It does not place orders yet** —
see [Not built yet](#not-built-yet).

There is no checkout table. The cart still lives in the visitor's browser (see
[cart-drawer.md](cart-drawer.md)); the page reads it through `useCart()`.

## Where things live

| Piece | Path |
| --- | --- |
| Route (server page, loads settings) | `src/app/(site)/checkout/page.js` |
| Tax + payment-method settings for the page | `src/lib/storefrontCheckout.js` |
| Hides the store header/footer on `/checkout` | `src/components/storefront/StorefrontChrome.js` (used by `src/app/(site)/layout.js`) |
| Page container: step state, persistence | `src/components/storefront/checkout/CheckoutPage.js` |
| Stepper, accordion card | `CheckoutStepper.js`, `CheckoutSection.js` |
| The three steps | `ContactStep.js`, `BillingStep.js`, `PaymentStep.js` |
| Order summary, promo code | `OrderSummary.js`, `CheckoutPromo.js` |
| Own header / footer | `CheckoutHeader.js`, `CheckoutFooter.js` |
| Validation, phone countries, tax total | `checkoutHelpers.js` |
| Shared field markup, class strings | `CheckoutField.js`, `checkoutStyles.js` |

## Behavior

- **Own chrome.** `StorefrontChrome` leaves out the announcement bar, store
  navigation and footer on `/checkout` (add a path to `STANDALONE_PATHS` for
  another such route). The page renders its own minimal header and footer. The
  cart provider and drawer still wrap it, so the cart is shared.
- **Three steps as an accordion**, with a stepper above:
  1. **Contact** – first / last name, email, phone with a calling-code picker
     (the eight shipping countries; +1 numbers are 10 digits, others 6–14), and
     the "keep me updated" checkbox.
  2. **Billing** – country (a dropdown), street address, optional apartment,
     and city, state / province and postal code, which are typed. One address is
     used for billing and delivery. The typed state and city are matched against
     `src/data/locationData.js`, the same list the account address forms use, so
     only places in it are accepted (add a state or city there to offer it).
     Matching ignores case and extra spaces, and a verified state or city is
     rewritten to the list's spelling ("surat" becomes "Surat"). The street
     address itself is only checked for being present — there is no
     address-verification service.
  3. **Payment** – the methods switched on in *Settings → Payment* (card,
     PayPal, Razorpay, cash on delivery). Cash on delivery is disabled below its
     minimum order amount.
- A step opens only once the ones before it are saved. Saved steps collapse to
  a summary and can be reopened; editing a field makes that step "unsaved" again
  and locks the steps after it.
- **The location must agree with itself.** Country → state → city → postal code
  are checked with `validateTypedLocation()` (`src/lib/validateAddress.js`), the
  typed-input version of the `validateLocationHierarchy()` check the account
  address forms use: a state not in the country, a city not in the state, a
  postal code in the wrong format for the country, or one whose prefix belongs
  to a different city is rejected, with the message on the field at fault.
  Editing the country, state or city clears the stale messages for the fields
  that depend on it (`ADDRESS_DEPENDENTS`).
- **Saving the address runs the cart's shipping estimate**
  (`estimateShipping()` → `POST /api/cart/shipping`) with the country, state,
  city and postal code. The server repeats the location check (the browser's
  check isn't trusted) and answers `400` with the offending `field`; the
  estimate then fills the summary's Shipping row (`FREE` or the rate).
- **Validation** runs in the browser first (`validateContact()`, `validateAddress()`):
  invalid fields get the pink fill and red border, an inline message, and focus
  moves to the first one.
- **Order summary** shows the cart lines, the promo code field (the cart's own
  `applyCoupon()`, so a code applied here also shows in the cart and vice versa),
  subtotal, discount, shipping, estimated tax and total.
- **Estimated tax** comes from *Settings → Currency & Tax*: the default rate
  applied to the discounted subtotal (plus shipping when *apply tax to shipping*
  is on). When *prices include tax* is on it shows **Included** and adds nothing.
  The rate is store-wide; there is no per-region tax yet.
- Typed values (not the payment choice) are kept in `sessionStorage["smb:checkout"]`
  so they survive **Edit Cart** and back. Session storage, not local storage, so
  personal details don't outlive the tab.
- An empty cart shows "Your cart is empty" with a link back to the shop.

## Not built yet

- **Placing an order.** The payment step ends in a disabled **Place Order**
  button. Nothing is saved or sent: no order row, no payment, no email. When it
  is built, re-price the cart from the database and re-check the coupon, stock
  and tax server-side rather than trusting the browser's cart (see "Not enforced
  yet" in [cart-drawer.md](cart-drawer.md)).
- **Marketing consent.** The "keep me updated on order status and special
  offers" checkbox is pre-checked, as in the design, and its value is not stored
  anywhere. Before it is persisted, split transactional updates from marketing
  and start the marketing consent unchecked (the store ships to the EU).
- **Payment badges** in the footer (Visa, Mastercard, Amex, PayPal, Apple Pay)
  are fixed marks from the design, not driven by *Settings → Payment*. Trim
  `PAYMENT_BADGES` in `CheckoutFooter.js` to what the gateway really accepts.
- Saved addresses for signed-in customers, a separate shipping address, and a
  shipping-method choice (local pickup) on this page.
