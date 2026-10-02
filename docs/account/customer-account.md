# Customer account dashboard

The signed-in customer's area of the storefront, at `/account`. It is the
customer-facing counterpart of the admin **My Account** pages
([`docs/my-account`](../my-account/workflow.md)), which belong to staff `users` and
are unrelated: customers and staff are separate identities with separate cookies,
tables and routes.

Before using it, apply the schema once: `npm run db:migrate:account`
(needs `customers` already: `npm run db:migrate:customers`).

## Where things live

| Piece | Path |
| --- | --- |
| Schema (addresses + saved cards) | `docs/account/customer-account-tables-only.sql` |
| Account frame (customer card, section menu, breadcrumb) | `src/app/(site)/account/layout.js`, `src/components/account/AccountShell.js` |
| Pages | `src/app/(site)/account/{page,orders,orders/[orderNumber],addresses,payment-methods,profile,wishlist}` |
| API (all `/api/account/**`) | `src/app/api/account/` — shared envelope + session check in `respond.js` |
| Server logic | `src/lib/customerOrders.js`, `customerAddresses.js`, `customerPaymentMethods.js`, `customerProfile.js` |
| Shared bits | `src/lib/accountError.js` (errors, optional-table helper), `accountLimits.js` (limits shared with the forms), `auth/customerPage.js` (page gate), `auth/redirect.js` (safe `?next=`) |
| UI | `src/components/account/` |

## Access control

- `src/middleware.js` redirects a visitor with no valid **customer** token away from
  `/account/**` to `/login?next=<the page they asked for>`. A staff token never
  passes: the JWT `scope` differs. This is only the early redirect.
- Every account page calls `requireCustomerPage()` and every `/api/account/**`
  handler calls `requireCustomer()`, which load the customer from the database.
  That, not the middleware, is the authorization (middleware does not cover `/api`).
- Every query is filtered by `customer_id`. Another customer's order number, address
  id or card id reads as "not found" (404), never as forbidden.
- After signing in the customer goes to `?next=` (only an in-app path: no `//`,
  backslash, absolute URL or `/admin`, see `safeRedirectPath`) or `/account`.
  Registering lands on `/account`. A signed-in visitor opening `/login` or
  `/register` is sent on to their account.
- The header and mobile-menu account icon link to `/account`.

## Sections

### Overview (`/account`)
Greeting, membership tier (`customers.customer_group`: Retail shows as "Member"),
loyalty points, counts for orders / wishlist / addresses / cards, the three latest
orders, the default shipping address and default card, and a "finish setting up"
nudge for a missing phone, address or card. Each part loads on its own: one that
fails shows its own notice instead of failing the page.

### Orders (`/account/orders`, `/account/orders/<number>`)
- **List:** status tabs with counts, order-number search, 10 per page, product
  thumbnails. Filters and paging are links / a GET form, so they work without JS.
- **Detail:** progress tracker (placed → processing → completed, or a cancelled
  notice), items with photos linking to the product, summary, shipping and billing
  address, payments (gateway reference shown as its last four characters only).
- **Order again:** the server re-prices each line against the catalog *as it is now*
  and returns `{ lines, skipped }`; the browser adds the lines to its own cart. A
  line whose product is gone, whose color/size no longer exists, or that is out of
  stock is skipped with a reason shown to the customer.
- **Cancel:** only an order that is `Pending` **and** `Unpaid`/`Failed`. The check is
  inside the `UPDATE` itself (no read-then-write race). Anything else gets a
  "contact us" message, because a paid or in-progress order needs a refund or
  staff action. A cancellation is logged as an admin notification
  (`order.cancelled`, severity warning) so staff see it in the bell.
- Totals: the `orders` table stores one total. When line items add up to less, the
  difference is shown as one "Shipping, tax & discounts" row; nothing is invented.
- **Optional tables:** line items, order addresses and payments live in the full
  orders schema (`docs/orders/orders-database-schema.sql`). If a database only has
  `orders-table-only.sql`, the list and detail still work and simply omit that
  detail (only a *missing table* is tolerated; any other error still surfaces).

### Wishlist (`/account/wishlist`)
The existing wishlist page (`WishlistPage`) inside the account frame, with a
narrower grid (`gridClassName`). Same data and behavior as `/wishlist`; see
[`../storefront/wishlist.md`](../storefront/wishlist.md).

### Addresses (`/account/addresses`)
- Address book, up to 10 (`MAX_ADDRESSES`). Label (Home / Work / Other / your own),
  recipient, company, phone, street, apartment, country, state, city, postal code,
  delivery instructions.
- **Default shipping** and **default billing** are separate flags; at most one of
  each per customer (partial unique indexes). The first address becomes both.
  Changing a default clears the old one first in the same transaction.
  Deleting a default hands that role to the most recently updated address left.
- The country → state → city → postal code check is the checkout's own
  (`validateTypedLocation`), run in the browser **and again on the server**; the
  state and city are saved spelled as the location list has them.
- Past orders keep their own copy of the address (`order_addresses`), so editing or
  deleting here never changes them.
- Phone numbers follow the app-wide convention in `src/lib/phone.js`: 10-digit
  US-style, optional.

### Payment methods (`/account/payment-methods`)
- Saved cards shown as card tiles: brand, masked number, name, expiry, default /
  expired / expires-soon badges, optional nickname and billing address (from the
  address book). Make default, edit (nickname, renewed expiry, billing address),
  remove, add. Up to 10 (`MAX_PAYMENT_METHODS`). An expired card can't be the default.
- Also lists the payment methods the store accepts (Settings → Payment).
- **Only display metadata is stored.** The browser works out the brand and last four
  digits (Luhn-checked) and sends just those with the expiry and name. The full
  number and CVV never leave the form, no CVV field is shown, and the server
  **refuses** any request carrying a `number`/`cvv`-style field so it can't reach a log.
- **Cards saved here are not chargeable yet.** `provider` / `provider_token` are
  reserved for the gateway's reusable token; until card capture goes through the
  gateway (see *Not built yet*) this page is a reference list.

### Profile & security (`/account/profile`)
- Member since, membership, points (read-only).
- **Personal details:** name, phone, "send me news and offers" (`accepts_marketing`).
- **Email address:** needs the current password; refuses an address already in use.
- **Password:** current password, live strength bar and rule checklist, confirm,
  show/hide; refuses reusing the current password. Stored only as a bcrypt hash.
- **Delete account:** current password **and** typing `DELETE`. Blocked while an
  order is `Pending`/`Processing`. Orders are kept but unlinked
  (`orders.customer_id` is `ON DELETE SET NULL`); the wishlist, addresses and cards
  cascade away. The session cookie is cleared.
- Email, password and delete share one limit of 8 password attempts per customer
  per 15 minutes (429 after that). The limiter is in memory per server instance
  (like `src/lib/rateLimit.js`'s other users): a speed bump, not a hard cap.

## Behavior shared by the forms

- One save at a time (synchronous ref guard), visible field-level errors with
  `aria-invalid` / `aria-describedby`, focus on the first invalid field, `noValidate`.
- Every mutation answers with the full updated list, so the screen shows only what
  the server confirmed.
- Removing an address or card, and cancelling an order, ask first (`window.confirm`,
  like the wishlist's removals).
- Light-only, Google Sans / Playfair; reuses the checkout's field and card styles
  (`CheckoutField`, `CheckoutAddressFields`, `checkoutStyles.js`).
- Dates are shown in UTC so the server render and the browser agree on the day.

## Data model

See `customer-account-tables-only.sql`. `customer_addresses` and
`customer_payment_methods` both reference `customers (id) ON DELETE CASCADE`;
`customer_payment_methods.billing_address_id` is `ON DELETE SET NULL`. Nothing
changes in `customers` or `orders` beyond what already exists
(`toPublicCustomer` now also returns `createdAt`).

## Not built yet

- **Charging a saved card.** Needs the gateway's tokenised capture (e.g. Stripe
  SetupIntent) to fill `provider_token`; the add-card form would then use the
  gateway's hosted fields instead of the plain number box.
- **Saving an address from checkout.** Checkout reads the address book (defaults
  preselected, a picker above each address; see
  [`../storefront/checkout.md`](../storefront/checkout.md)) but a new address typed
  there isn't offered for saving. It also doesn't carry a saved address's
  recipient name, phone or delivery notes yet.
- **Orders appear once checkout places them.** Checkout does not create orders yet,
  so today only orders staff or scripts attach to a customer show up here.
- **Shipment tracking, invoices/receipts, returns.** No carrier, invoice or return
  data exists to show.
- **Email verification** when the address changes, and **ending other devices'
  sessions** after a password change (sessions are stateless JWTs with no
  server-side revocation).
- **Real loyalty rules.** Points and tier are displayed from `customers`; nothing
  earns or redeems them.
