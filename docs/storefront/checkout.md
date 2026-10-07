# Storefront checkout

The public checkout page at `/checkout`, reached from **Checkout** in the cart
drawer and **Proceed to checkout** on the cart page. It collects contact and
address details, shows the order summary and takes **card payments through
Stripe** ([Card payments](#card-payments-stripe)) and **cash on delivery**
([Cash on delivery](#cash-on-delivery)). The other payment methods
(PayPal, Razorpay) can't take an order yet; see
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
| Order confirmation page (`/checkout/complete`) | `src/app/(site)/checkout/complete/page.js`, `CheckoutResult.js`, `OrderConfirmationDetails.js` (the full order, with an icon on each fact and contact line; when the billing and shipping addresses say the same thing it shows one "Shipping & billing address" card with a note instead of two); the totals row and line thumbnail it shares with the sidebar are in `OrderSummaryParts.js` |
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
- **Guest checkout follows Settings → Checkout → Allow guest checkout**
  (`checkout_settings.allow_guest_checkout`, `src/lib/checkoutSettings.js`;
  `npm run db:migrate:checkout`). On (the default, and what a store without the
  table gets): guests see the "Checking out as a guest" panel above and can place an
  order without an account. Off: `page.js` shows `CheckoutSignInRequired` (Sign in /
  Create an account, both returning to `/checkout`) instead of the form to anyone not
  signed in, and `startCardPayment()` refuses a guest order with a 403
  `sign_in_required` (the API is public, so the page alone isn't the gate); the card
  form then refreshes the page into the sign-in screen. Signed-in customers are never
  affected.
- **Signed-in customers get their account filled in.** `page.js` reads the customer
  session and their address book (`loadCheckoutAccount()`); a guest, or a customer
  whose session or address book can't be read, simply gets the guest checkout.
  - *Contact* opens with the account's name, email and phone (the phone in US
    format, as the account stores it). A guest sees a "Checking out as a guest"
    panel instead, with **Sign in** (`/login?next=/checkout`) and **create an
    account** (`/register?next=/checkout`) links that return here with the cart
    and anything typed kept.
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
- **Refunds.** The site never refunds a payment. When a customer cancels a paid order from their
  account, the store is emailed to refund it by hand and the customer's "cancelled" email says the
  store will be in touch (see [customer-account.md](../account/customer-account.md)). Refunds made in
  the Stripe Dashboard (`charge.refunded`) aren't handled, and setting an order to Refunded or
  Cancelled in admin neither refunds nor sends a refund email. *Settings → Orders* "Require order
  confirmation email before fulfillment" is stored but not read. Stripe also emails its own
  receipt in live mode if receipts are on in the Stripe Dashboard, which would arrive in
  addition to ours.
- **Refunds** and `charge.refunded` events aren't handled.
- **Settings → Customers → Allow guest checkout** is a separate, still unsaved toggle:
  only the one on *Settings → Checkout* is read by the storefront. The other checkout
  settings (phone/terms required, minimum order, abandoned-cart emails) are saved but not
  acted on yet.
- The marketing checkbox is still not stored on the guest customer.

## Cash on delivery

Choosing it (when switched on in *Settings → Payment*) shows a note and a working
**Place Order** (`CodPlaceOrder.js`); there is no gateway.

1. The button posts the cart to `POST /api/checkout/payment` with `paymentMethod: "cod"`
   (the same request as a card order, same rate limit). `placeCodOrder()` in
   `checkoutOrders.js` applies the guest-checkout gate, refuses with `method_unavailable`
   when cash on delivery is off or the priced total is below *Settings → Payment → COD minimum
   order*, prices the cart itself, then saves the order with `insertOrder()`.
2. The order is **Pending / Unpaid** with a pending `cod` row in `payments` (no
   `provider_reference`). Staff mark it Paid in the admin once the cash is collected. The
   store gets an `order.placed` notification ("New cash on delivery order #…"), since
   nothing else announces it (a card order is announced when it is paid).
3. The browser goes to `/checkout/complete?cod=<order id>`. `resolveCodResult()` loads the
   order only if it has a `cod` payment; the random order UUID is the proof the visitor placed
   it (the counterpart of the card flow's client secret). The page then empties the cart.

## Engraving

An engraved cart line travels as `engraving: { text, fontId }` (never a font name or a price).
`priceLines()` in `checkoutPricing.js` validates it against the store's current settings and answers
`409 cart_changed` with `engravingInvalid` on the line when it can't be used, which makes the cart drop the
engraving from that line. A valid one is stored on `order_line_items` and shown in the summary, the
confirmation page, the account, the admin order, the emails and the invoice. Stock is checked per variant
across all of its lines, since engraved copies of one variant share its stock. Details in
[engraving](../engraving/engraving.md).

## Order emails

Six emails, all in one design (`src/lib/orderEmail.js`, sent by `src/lib/email.js`, triggered by
`src/lib/orderEmails.js`). Each is best-effort: a problem is logged and never fails the order, the
payment sync or the status change. All go out from the sender name and email in *Settings → Email*.
Building and sending one takes several seconds, so it runs after the response has gone out (Next's
`after()` in `orderEmails.js`): the customer's confirmation page and the admin's Save don't wait for it.

| Email | To | When | Switch |
| --- | --- | --- | --- |
| Order confirmation | customer | COD order saved; card order moves into Paid | *Settings → Email → order confirmation emails* |
| New order | store | same moments | *Settings → Email → new order emails*; sent to the *Settings → General* Store Email |
| Processing order | customer | staff set the status to Processing on Edit Order (`PATCH /api/orders/[id]`) | *Settings → Email → processing order emails* |
| Completed order | customer | staff set the status to Completed | *Settings → Email → completed order emails* (stored in the older `send_shipping_notification_emails` column) |
| Cancelled order | customer | staff set the status to Cancelled, or the customer cancels | *Settings → Email → cancelled order emails* |
| Refund needed | store | a customer cancels an order they had paid for | always sent when SMTP is set up; to the *Settings → General* Store Email |
| Failed order | customer | a card payment is declined (order goes Unpaid → Failed), once | *Settings → Email → failed order emails* |

A cancelled email says "we'll refund your payment ... and be in touch to confirm" for a paid
order (whoever cancelled it; the order is marked Refunded once staff have refunded it, and the email
then says it has been refunded), else "you haven't been charged". "Failed" carries a Try again button to `/checkout`.

### Order confirmation email

`sendOrderConfirmation()` in `checkoutOrders.js` emails the customer once per order, built by
`buildOrderConfirmationEmail()` (`src/lib/orderEmail.js`, the same design as the account
welcome email) and sent with `sendOrderConfirmationEmail()` (`src/lib/email.js`).

- **When:** a cash-on-delivery order, right after it is saved; a card order, when it moves into
  Paid (`syncPaymentIntent()`, which is atomic, so the webhook and the return page can't both
  send it). Not for an order that was cancelled before the money arrived.
- **From:** the sender name and email saved in *Settings → Email* (the same `sendEmail()` every
  email uses; the `SMTP_*` env vars are only a fallback). The footer's "write to" address is that
  sender email, falling back to *Settings → General → Store Email*.
- **Switch:** *Settings → Email → Send order confirmation emails*. Off, or SMTP not configured,
  means nothing is sent (logged, never an error for the customer).
- **Content:** order number, date, payment (cash on delivery or "Visa ending 4242" / "Card"),
  items with totals, shipping and billing address (merged into one block when equal), what
  happens next, and a "View your order" button to `/account/orders/<number>` for signed-in
  customers only (guests have no account). Product photos are attached to the email
  (see **Outlook and Gmail** below).
- **Outlook and Gmail.** The layout is written for Outlook's Word-based renderer, which ignores padding
  and borders on `<div>`/`<a>`, margins on tables, rounded corners and `max-width`: so the button, the
  facts band and the "Didn't place this order?" note are table cells with `bgcolor` and padding, and every
  table carries `cellpadding/cellspacing/border`. Outlook forces Arial (a `[if mso]` rule). Outlook also
  blocks remote pictures and can't show WebP, so the logo **and each product photo** are attached
  inline (`cid:`); `embedItemImages()` in `email.js` fetches each photo and shrinks it to a ~3 KB 120px
  JPEG with `sharp`, so even a 5 MB original or a WebP works. A photo that can't be fetched shows a plain
  grey square. Keep new email markup table-based. Check changes in real Outlook and Gmail: the browser can't
  reproduce Outlook's renderer.
- **Logo and font:** the header is the storefront logo (`public/storefront/logo.png`), attached
  to the email as an inline `cid:` image so it shows even before the store is public; if the file
  can't be read it falls back to the public URL, then to a text wordmark. The font is Google
  Sans through a stylesheet link: Apple Mail and iOS Mail show it, Gmail and Outlook ignore web
  fonts and show Arial.
- A failure is logged ("Order confirmation email failed") and never fails the order or payment.

## Not built yet

- **Other payment methods.** PayPal and Razorpay are listed when switched on, but choosing
  one leaves **Place Order** disabled: only card and cash on delivery take an order.
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
