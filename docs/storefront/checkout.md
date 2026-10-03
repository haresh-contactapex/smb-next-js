# Storefront checkout

The public checkout page at `/checkout`, reached from **Checkout** in the cart
drawer and **Proceed to checkout** on the cart page. It collects contact and
address details, shows the order summary and takes **card payments through
Stripe** ([Card payments](#card-payments-stripe)). The other payment methods
(PayPal, Razorpay, cash on delivery) can't take an order yet; see
[Not built yet](#not-built-yet).

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
| Stripe card form and Place Order | `StripePaymentForm.js`, `stripeClient.js` |
| Order confirmation page (`/checkout/complete`) | `src/app/(site)/checkout/complete/page.js`, `CheckoutResult.js`, `OrderConfirmationDetails.js` (the full order); the totals row and line thumbnail it shares with the sidebar are in `OrderSummaryParts.js` |
| Stripe REST client, key handling, webhook signature check | `src/lib/stripe.js` |
| Prices and validates an order from the database | `src/lib/checkoutPricing.js` |
| Saves the order, syncs payment results | `src/lib/checkoutOrders.js` |
| Place Order endpoint, Stripe webhook | `src/app/api/checkout/payment/route.js`, `src/app/api/stripe/webhook/route.js` |
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
  address forms use: a state not in the country, a postal code in the wrong
  format for the country, or one whose prefix belongs to a different city is
  rejected, with the message on the field at fault. The city list in
  `locationData.js` is only a curated subset, so a city it doesn't list is
  accepted as typed with just the postal code's format checked.
  **United States only:** all 50 states + DC are accepted, and the server also
  checks the address against the full ZIP database (`validateUsLocation()` in
  `src/lib/usAddress.js`, backed by the `zipcodes` npm package, ~44k ZIPs; server
  code only, never import it into a client component). The ZIP must exist, belong
  to the typed state, and the city must be the ZIP's city or another real city in
  that state within 25 miles of it ("Los Angeles" for a North Hollywood ZIP is
  fine; a typo or a city from elsewhere is not). It runs when the address step is
  saved (`/api/cart/shipping`, for the billing address too when it differs from
  shipping), when the order is placed (`parseAddress()` in `checkoutPricing.js`)
  and when a saved address is stored (`customerAddresses.js`). Other countries get
  no extra check. The ZIP data is a 2024 snapshot: refresh it with
  `npm update zipcodes` (a brand-new ZIP would be rejected until then).
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

## Card payments (Stripe)

Choosing **Credit or debit card** in the payment step shows Stripe's Payment Element
and **Place Order**. Everything below is the card flow. **Every Stripe credential is saved in
*Settings → Payment*** (the publishable key, the secret key and the webhook signing secret);
none of them is read from `.env.local` or any other environment variable.

### Set-up

1. In *Settings → Payment* switch Stripe on and save its **publishable** and **secret**
   keys. They must be from the same mode (both `test` or both `live`); the page checks the
   format and the mode when you save and says which key is wrong. If they are still missing
   or mismatched at checkout, the card method shows "Card payments aren't available right
   now" and can't be picked (the reason is logged on the server). Only the publishable key
   ever reaches the browser.
2. Run the order tables migration once: `npm run db:migrate:order-details`
   (`docs/orders/order-details-tables-only.sql`, see the [orders schema](../orders/orders-database-schema.md)).
   Without it Place Order fails after Stripe has created the payment, which is then cancelled;
   in development the response says which table is missing.
3. Add a Stripe webhook (Dashboard → Developers → Webhooks) for `payment_intent.succeeded`
   and `payment_intent.payment_failed` pointing at `https://<your domain>/api/stripe/webhook`
   (the form shows the URL for the site you are on), and paste its signing secret (`whsec_...`)
   into **Webhook signing secret** under Stripe in *Settings → Payment*. Locally,
   `stripe listen --forward-to localhost:3000/api/stripe/webhook` prints a secret to use there.
   The webhook is what marks an order Paid when a customer pays but closes the tab before
   the confirmation page loads. Until the secret is saved it answers 503 and Stripe retries.
   The saved column comes from `npm run db:migrate:stripe-webhook`
   (`docs/settings/payment-stripe-webhook-secret-only.sql`); a database created from the
   current `payment-table-only.sql` already has it.

Switching Stripe off stops new card payments, but the confirmation page and the webhook keep
working while the keys are saved, so a payment that was already under way can still settle.

With **test** keys the payment step shows a banner and takes Stripe's test cards (4242 4242
4242 4242, any future date and CVC). With *auto capture* switched off in *Settings → Payment*
the payment is only authorized; capture it from the Stripe dashboard and the webhook marks
the order Paid.

### What happens when the customer presses Place Order

1. The Payment Element validates what was typed (Stripe.js loads from `js.stripe.com` only
   once the customer reaches this step).
2. `POST /api/checkout/payment` receives **what to buy and for whom** (product and variant
   ids, quantities, the two addresses, the contact, a coupon *code*, the shipping rate id)
   and **the total the customer was shown**. It never trusts a price, discount or total:
   `checkoutPricing.js` reads each line's price and stock from the database, checks the
   coupon and shipping rules, validates both addresses with `validateTypedLocation()`, adds
   tax from *Settings → Currency & Tax*, and compares its total with the one shown.
3. If anything differs it answers `409` with a `reason` and the checkout reacts:
   `cart_changed` (price or stock) updates the cart's lines from `details.lines` and asks the
   customer to look again, `coupon_invalid` removes the code, `total_changed` refreshes the page.
   Nothing is charged and nothing is saved.
4. Otherwise it creates a Stripe PaymentIntent for exactly the server's total, then saves the
   order (`Pending` / `Unpaid`, or the default status from *Settings → Orders*) with its two
   addresses, line items, the price breakdown and a pending `payments` row holding the
   intent id, all in one transaction. A guest gets a guest `customers` row; a signed-in
   customer's order is attached to their account. If saving fails, the intent is cancelled.
5. The browser confirms the intent with the card details (handling 3-D Secure) and goes to
   `/checkout/complete`.
6. That page asks **Stripe**, not the URL, how the payment went (the URL's client secret must
   match), brings the order up to date, shows the result and, for a placed order, empties the cart.
   A placed order (paid, authorized or processing) is shown **in full**: order number, date,
   total and payment method ("Visa ending 4242", read from the PaymentIntent's expanded payment
   method), every item with its photo, SKU, quantity and price, the subtotal / discount /
   shipping / tax breakdown, and the contact, shipping and billing details. The order comes
   from `getOrderConfirmation()` (`src/lib/orders.js`), which shares its query with the Edit Order
   page and the invoice but returns nothing internal (no payment references or ids). A declined
   or unfinished payment, and an order saved without its detail rows, show only the order number
   and total. The contact email falls back to the Stripe receipt email, and the phone to the
   order's address, when the customer row no longer exists. Everything is behind the same client-secret
   check as the result, so the bare `?order=` number reveals nothing.

A declined card keeps the same order and intent, so correcting the card and retrying doesn't
create a second order; changing the cart or addresses creates a new one, and the abandoned
one stays `Pending` / `Unpaid` until it is cancelled (*Settings → Orders* auto-cancel).
The endpoint is rate limited per client address (12 requests in 10 minutes, in memory).

### Paid, failed and the webhook

`syncPaymentIntent()` (`checkoutOrders.js`) is the only place an order becomes Paid. It runs
from the webhook and from the confirmation page, is idempotent, and only marks Paid when
Stripe reports the order's full amount in its currency. A failed attempt sets `Failed`; a
later successful retry sets `Paid`. A payment that arrives for an already-cancelled order
is marked Paid and raises a warning in the admin notifications, since it needs a refund.
The admin gets **one "order paid" notification per order**: if an order leaves Paid and a
later sync moves it back (a staff edit while testing, say), the order is updated again but
the team isn't alerted a second time. The `payments` table still records every payment.

### Not handled yet

- **Stock** isn't decremented when an order is paid (the server only refuses lines that
  are out of stock when the order is placed, so two buyers can still race for the last unit).
- **Coupon usage** (`usage_count`, one per customer) isn't recorded.
- **Emails**: no order confirmation is sent (*Settings → Orders* "confirmation email").
- **Refunds** and `charge.refunded` events aren't handled.
- **Guest checkout** can't be switched off: the "Allow guest checkout" settings forms
  aren't backed by a table yet.
- The marketing checkbox is still not stored on the guest customer.

## Not built yet

- **Other payment methods.** PayPal, Razorpay and cash on delivery are listed when switched
  on, but choosing one leaves **Place Order** disabled: only card payments take an order.
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
