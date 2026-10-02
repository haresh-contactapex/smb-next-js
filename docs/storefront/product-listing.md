# Storefront product listing

The public listing at `/women-wedding-bands`: a filter bar and a grid of ACTIVE
catalog products, with **Load more** paging. There is no listing table; it reads
the admin catalog (`products`, `product_media`, `product_variants`).

## Where things live

| Piece | Path |
| --- | --- |
| Page (loads the first page, passes the total) | `src/app/(site)/women-wedding-bands/page.js` |
| Filter bar, grid, Load more, price search | `src/components/storefront/ProductListing.js` |
| Card (wishlist heart, cart icon) | `src/components/storefront/ProductCard.js` |
| Shimmer skeletons (page load, filter search, Load more) | `ProductListingSkeleton.js`, `src/app/(site)/women-wedding-bands/loading.js` |
| Query | `queryStorefrontProducts()`, `listStorefrontProductsPage()` in `src/lib/products.js` |
| Public endpoint | `src/app/api/storefront/products/route.js` |

## Behavior

- The server renders the first page (`STOREFRONT_PAGE_SIZE`, 12). **Load more**
  fetches the next page and appends it, under a row of shimmer cards the size of
  what is coming. The footer shows "Showing X of Y products" and a progress bar;
  the button disappears once every product is shown.
- The **price** boxes search on the server: after typing pauses (350 ms) the list
  is replaced by page one of the matching products and the total updates. Load
  more continues with the range that list was fetched with, not half-typed text.
  A newer search cancels an older one still in flight.
- A failed fetch keeps the products on screen, shows the error and turns the
  button into **Try again**. If nothing is on screen it offers Try again too.
- Products already shown are never added twice, even if the catalog changes
  between clicks.
- **Metal color** and **band size** are selectable but don't filter yet; products
  don't carry that data.

## Endpoint

`GET /api/storefront/products` – public, no session.

| Query | Meaning |
| --- | --- |
| `limit` | Page size, 1–48 (default 12) |
| `offset` | Products to skip, 0–100000 (default 0) |
| `minPrice`, `maxPrice` | Optional price bounds (zero or more); blank means unbounded |

Returns `{ success: true, data: { products, total, hasMore } }`, where `total`
counts every ACTIVE product matching the price range. A bad parameter is a `400`
with `{ success: false, error }`; a database failure is a `500`.

Products are ordered `created_at DESC, id`. The `id` tiebreaker keeps the order
stable when products share a timestamp, which offset paging depends on.
