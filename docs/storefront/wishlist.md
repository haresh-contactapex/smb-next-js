# Storefront wishlist

The heart on product cards and the product page, the heart-with-count in the
header, and the `/wishlist` page.

A wishlist entry is only a reference: a product and, optionally, the variant
(color / size) the customer chose. Titles, prices, stock and ratings are always
read live, so a saved item never goes stale.

## Two homes for one list

| Visitor | Where the list lives | Schema |
| --- | --- | --- |
| Guest (not signed in) | `localStorage["smb:wishlist"]` as `[{ productId, variantId }]`, synced between tabs | none |
| Signed-in customer | `wishlist_items` table, so it follows them to any device | [wishlist-table-only.sql](wishlist-table-only.sql) |

Apply the table with `npm run db:migrate:wishlist` (needs `customers`,
`products` and `product_variants` first). Guests and the product details lookup
work without it; only the signed-in paths need the table.

**Merge at sign-in.** `LoginForm` and `RegisterForm` call `mergeGuestWishlist()`
right after the session cookie is set: the browser's guest list is POSTed to
`/api/wishlist/merge` and, only once the server has it, removed from
`localStorage`. If that fails nothing is lost; the storefront retries on its
next load, because `WishlistProvider` merges any leftover guest items whenever
it finds a session. Items for products that were deleted or are no longer
`ACTIVE` are skipped, already-saved items are not duplicated, and the account
list is capped at 100 items.

**Sync.** On every storefront load the provider asks `GET /api/wishlist` whose
list this is. It refreshes again when the tab regains focus (at most every 30
seconds), which is how a change made on another device shows up. If the session
has ended the provider falls back to the browser's guest list and does not copy
the account list into `localStorage`.

## Where things live

| Piece | Path |
| --- | --- |
| Wishlist state, `useWishlist()`, optimistic updates with rollback, toasts | `src/components/storefront/wishlist/WishlistProvider.js` |
| Pure helpers and the guest list's `localStorage` round trip | `wishlistHelpers.js` |
| Guest → account merge | `wishlistApi.js` |
| Header heart + count badge (links to `/wishlist`) | `WishlistButton.js` |
| Heart toggle on `ProductCard` and `ProductPurchasePanel` | `WishlistHeart.js` |
| `/wishlist` page and its cards | `src/app/(site)/wishlist/page.js`, `WishlistPage.js`, `WishlistCard.js`, `useWishlistProducts.js` |
| Server queries and validation | `src/lib/wishlist.js` |
| Endpoints | `src/app/api/wishlist/route.js`, `merge/route.js`, `products/route.js` |

`WishlistProvider` is mounted once in `src/app/(site)/layout.js`, inside
`CartProvider`.

## Behavior

- Every heart means "this product is on my wishlist": it is filled whichever
  color / size was saved, and clicking a filled heart removes the product (every
  saved variant of it). Saving from the product page remembers the **selected
  variant**; saving from a listing card, which has none to choose, saves the
  product alone and the wishlist page then shows its default variant. The saved
  variant is changed on the wishlist page, not by the heart.
- The header count follows adds and removes anywhere on the storefront.
- Changes show immediately and are undone, with an error toast, if the server
  rejects them. A `401` while saving means the session ended: the item is kept as
  a guest item and the list falls back to the browser's.
- Hearts are disabled until the first `GET /api/wishlist` returns, so an early
  tap can't be lost to the sign-in check.

### Wishlist page

Each card shows the product image, name, price (regular price struck through
and a Sale tag when on sale), average approved-review rating, availability
(`In stock`, `Only N left` at 5 or fewer tracked units, `Out of stock`), the
selected variant as editable color / size pickers, **Add To Cart** (opens the
cart drawer; disabled when the variant is out of stock) and **Remove from
wishlist**. Changing a picker updates the saved entry. A product that is no
longer sold shows a placeholder card that can only be removed. Guests see a
note offering sign-in, since that is what carries the list to other devices.

## API

All responses use `{ success, data }` / `{ success: false, error }`.

| Method | Path | Auth | Body → data |
| --- | --- | --- | --- |
| `GET` | `/api/wishlist` | optional | → `{ authenticated, items: [{ productId, variantId }] }` (guest: `authenticated: false`, no items) |
| `POST` | `/api/wishlist` | customer | `{ productId, variantId? }` → `{ saved }`; idempotent; `404` for an inactive product, `409` when the list is full |
| `DELETE` | `/api/wishlist` | customer | `{ productId, variantId? }` or `{ productId, allVariants: true }` → `{ removed }` |
| `PATCH` | `/api/wishlist` | customer | `{ productId, variantId, toVariantId }` → `{ updated }` |
| `POST` | `/api/wishlist/merge` | customer | `{ items }` → `{ items }` (the whole resulting list) |
| `POST` | `/api/wishlist/products` | public | `{ productIds }` → `{ products }` with price, rating, options and variants; inactive products are omitted |

Mutating routes check the customer session themselves (`getCurrentCustomer()`),
since `middleware.js` does not cover `/api`. Customer and staff sessions stay
separate: a staff token is never accepted here.
