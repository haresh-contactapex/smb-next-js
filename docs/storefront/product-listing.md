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
- The **Filters** heading collapses the whole filter area (closed by default) and
  shows a badge with how many filters are set. Each filter in use also appears as
  a removable chip in the Filters bar (metals with their swatch, "Size 7", and the
  price range such as "From $500"), visible even while the panel is closed;
  **Clear all filters** resets them all.
- **Metal color** and **band size** are built from the catalog, not a fixed list:
  `listStorefrontFilterOptions()` collects every value of a product option named
  like *color/metal* or *size* on ACTIVE products in the listing (the category and
  its sub-categories on a collection page, the whole shop otherwise). Values that
  differ only by case count once, sizes sort numerically, and a group with no
  values is hidden. Swatches come from `metals.js` (`metalColor`, `metalLabel`):
  gold, platinum, cobalt, titanium, zirconium and the like have their own colors,
  and a two-tone PVD finish ("... and Black PVD") is a half-gold, half-black
  swatch. Only a metal `metalColor` doesn't know gets a neutral grey swatch.
  Names without a short code (cobalt, PVD finishes) are shown in full.
- Choosing metals (any of them) and/or a band size searches on the server like the
  price boxes do, from page one. Clicking the chosen size again clears it.

## Endpoint

`GET /api/storefront/products` – public, no session.

| Query | Meaning |
| --- | --- |
| `limit` | Page size, 1–48 (default 12) |
| `offset` | Products to skip, 0–100000 (default 0) |
| `minPrice`, `maxPrice` | Optional price bounds (zero or more); blank means unbounded |
| `metal` | Repeatable. A color/metal option value (e.g. `Platinum`); products with any of them match. Case-insensitive |
| `size` | A size option value (e.g. `7`) |

Returns `{ success: true, data: { products, total, hasMore } }`, where `total`
counts every ACTIVE product matching the filters. A bad parameter is a `400`
with `{ success: false, error }`; a database failure is a `500`.

Products are ordered `created_at DESC, id`. The `id` tiebreaker keeps the order
stable when products share a timestamp, which offset paging depends on.
