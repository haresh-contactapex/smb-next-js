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
| Tax + payment-method settings, and the signed-in customer's details + saved addresses | `src/lib/storefrontCheckout.js` (`loadCheckoutSettings()`, `loadCheckoutAccount()`) |
| Hides the store header/footer on `/checkout` | `src/components/storefront/StorefrontChrome.js` (used by `src/app/(site)/layout.js`) |
| Page container: step state, persistence | `src/components/storefront/checkout/CheckoutPage.js` |
| Stepper, accordion card | `CheckoutStepper.js`, `CheckoutSection.js` |
| The three steps | `ContactStep.js`, `BillingStep.js`, `PaymentStep.js` |
| Order summary, promo code | `OrderSummary.js`, `CheckoutPromo.js` |
| Own header / footer | `CheckoutHeader.js`, `CheckoutFooter.js` |
| Shimmer loading skeleton | `CheckoutSkeleton.js`, `src/app/(site)/checkout/loading.js` |
| Validation, phone countries, tax total | `checkoutHelpers.js` |
| One address block, used for billing and for shipping | `CheckoutAddressFields.js` |
| "Saved addresses" picker above an address block | `SavedAddressPicker.js` (matching and starting values: `startingCheckout()`, `addressMatches()` in `checkoutHelpers.js`) |
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
  2. **Billing** – a **Billing Address** and a **Shipping Address**, each with a
     country (a dropdown), street address, optional apartment, and city, state /
     province and postal code, which are typed. **Same as billing address**
     (checked by default) copies the billing address into the shipping fields,
     keeps them in step as billing is edited, and disables them; unchecking it
     enables them with that copy in place to edit on their own. Each typed
     state and city is matched against
     `src/data/locationData.js`, the same list the account address forms use, so
     only places in it are accepted (add a state or city there to offer it).
     Matching ignores case and extra spaces, and a verified state or city is
     rewritten to the list's spelling ("surat" becomes "Surat"). The street
     address itself is only checked for being present — there is no
     address-verification service.
  3. **Payment** – the methods switched on in *Settings → Payment* (card,
     PayPal, Razorpay, cash on delivery). Cash on delivery is disabled below its
     minimum order amount.
- **Signed-in customers get their account filled in.** `page.js` reads the customer
  session and their address book (`loadCheckoutAccount()`); a guest, or a customer
  whose session or address book can't be read, simply gets the guest checkout.
  - *Contact* opens with the account's name, email and phone (the phone in US
    format, as the account stores it). A guest sees "Already have an account? Sign
    in" instead, which returns here (`/login?next=/checkout`) with the cart and
    anything typed kept.
  - *Billing* opens with the customer's **default billing** address as the billing
    address and their **default shipping** address as the shipping address;
    **Same as billing address** is on exactly when those are the same saved
    address.
  - A **Saved addresses** picker sits above each address block, with a *Manage saved
    addresses* link to `/account/addresses`. Choosing one fills the block with its
    street, apartment, city, state, postal code and country (and, while "same as
    billing" is on, the shipping copy follows); **Enter a different address**
    empties everything under the country. The picker's selection is worked out from
    the values, so editing a field after picking one moves it to "different" by
    itself. The shipping picker is disabled while "same as billing" is on.
  - Anything already typed in this tab (session storage) wins over these starting
    values, so coming back from Edit Cart never overwrites an edit; only blank
    contact fields are filled, and the defaults apply only while no address has
    been typed yet.
  - A saved address is not trusted: **Save & Continue** validates it with
    `validateAddress()` and the server repeats the location check in the shipping
    estimate, exactly as for a typed one. A saved country the store no longer
    ships to is dropped like any restored address.
  - Only the six address fields are copied. A saved address's label, recipient
    name, company, phone and delivery notes aren't used by the checkout (it has
    no fields for them yet).
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
- **Validation follows the checkbox.** Checked: the shipping address *is* the
  billing one, so it is validated once and any problem shows on the billing
  fields (the disabled shipping fields never show errors). Unchecked: both
  addresses are validated, each on its own fields, and focus goes to the first
  invalid field in form order. Switching the checkbox clears the messages on the
  shipping fields.
- **Saving the addresses runs the cart's shipping estimate** for the *shipping*
  address (`estimateShipping()` → `POST /api/cart/shipping`) with its country,
  state, city and postal code. The server repeats the location check (the
  browser's check isn't trusted) and answers `400` with the offending `field`,
  shown on the shipping fields (or the billing ones when the two are the same);
  the estimate then fills the summary's Shipping row (`FREE` or the rate). The
  billing address is checked in the browser only for now.
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
- Typed values and the checkbox (not the payment choice) are kept in
  `sessionStorage["smb:checkout"]` as `{ contact, billing, shipping,
  sameAsBilling }` so they survive **Edit Cart** and back. Session storage, not local storage, so
  personal details don't outlive the tab.
- **Loading shimmer**, the same `.shimmer` placeholder the listing and product
  pages use (`storefront.css`):
  - `CheckoutSkeleton` mirrors the page (stepper, the open Contact card, the two
    collapsed cards, the order summary). `loading.js` shows it inside the
    checkout's own header and footer while `page.js` reads the tax and payment
    settings. `CheckoutPage` shows it again until the cart has been read from
    the browser, so the server HTML is the skeleton rather than a blank gap or a
    flash of "empty cart".
  - Its bars are sized to the line of text they stand in for, and it shares the
    page frame (`CHECKOUT_CONTAINER`, `CHECKOUT_GRID` in `checkoutStyles.js`) with
    the real page, so content replaces it without jumping. If the page's text
    sizes or spacing change, re-measure and adjust the slot heights in
    `CheckoutSkeleton.js`. Product names that wrap make the real summary taller
    than the skeleton's.
  - The summary's product thumbnails shimmer until the photo arrives
    (`useImageLoaded`); a photo that fails to load stops shimmering.
- An empty cart shows "Your cart is empty" with a link back to the shop.

## Not built yet

- **Placing an order.** The payment step ends in a disabled **Place Order**
  button. Nothing is saved or sent: no order row, no payment, no email. When it
  is built, re-price the cart from the database and re-check the coupon, stock
  and tax server-side rather than trusting the browser's cart (see "Not enforced
  yet" in [cart-drawer.md](cart-drawer.md)), and validate **both** addresses
  again with `validateTypedLocation()`: only the shipping one reaches the server
  today.
- **Marketing consent.** The "keep me updated on order status and special
  offers" checkbox is pre-checked, as in the design, and its value is not stored
  anywhere. Before it is persisted, split transactional updates from marketing
  and start the marketing consent unchecked (the store ships to the EU).
- **Payment badges** in the footer (Visa, Mastercard, Amex, PayPal, Apple Pay)
  are fixed marks from the design, not driven by *Settings → Payment*. Trim
  `PAYMENT_BADGES` in `CheckoutFooter.js` to what the gateway really accepts.
- A shipping-method choice (local pickup) on this page.
- **Saving a new address from checkout** into the address book (and delivery
  notes / recipient name per address). Saved addresses are read-only here; they are
  managed at `/account/addresses` ([account.md](../account/customer-account.md)).
