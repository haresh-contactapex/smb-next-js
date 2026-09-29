# Reports

Read-only aggregate reporting over existing tables — no new tables are
introduced by this feature (the one schema change is documented separately:
see `docs/orders/orders-database-schema.md`'s Design notes on adding
`'Failed'` to `orders.payment_status`). All queries live in
`src/lib/reports.js`; the page (`src/app/reports/page.js`) calls them
directly, same pattern as `src/app/orders/page.js` / `src/app/all-coupons/page.js`.

Scope: this covers exactly the report sections requested — Orders, Product
inventory, and Payments. It does not attempt to cover every sidebar menu;
Coupons/Customers/Media reports can be added later as more `src/lib/reports.js`
functions following the same pattern.

## Order Reports → Order Summary

Source: `orders` table (`docs/orders/`).

| Stat | Query |
| --- | --- |
| Total Orders | `COUNT(*)` |
| Completed Orders | `COUNT(*) WHERE status = 'Completed'` |
| Pending Orders | `COUNT(*) WHERE status = 'Pending'` |
| Processing Orders | `COUNT(*) WHERE status = 'Processing'` |
| Cancelled Orders | `COUNT(*) WHERE status = 'Cancelled'` |
| Refunded Orders | `COUNT(*) WHERE payment_status = 'Refunded'` |

`orders` has no separate "Refunded" order status — `status` is
Pending/Processing/Completed/Cancelled only. Refunded orders are identified by
`payment_status = 'Refunded'` instead, independent of the order's own status.

## Product Reports → Inventory Report

Source: `products` + `product_variants` (`docs/category-product/`), plus the
`low_stock_threshold` stored on `products_settings`
(`src/lib/productsSettings.js`, Settings → Products).

Effective inventory per product matches `listProducts()`
(`src/lib/products.js`): the sum of its variants' `inventory_quantity`, falling
back to the product's own `inventory_quantity` when it has no variants.

| Stat | Definition |
| --- | --- |
| Current Stock | Sum of effective inventory across all products |
| Low Stock Products | Count where `0 < inventory <= low_stock_threshold` |
| Out of Stock Products | Count where `inventory <= 0` |

The threshold is read live from `products_settings` on every request rather
than hardcoded, so changing it in Settings → Products immediately changes
which products count as "low stock" here.

## Payment Reports → Payment Summary

Source: `orders.payment_status` and `orders.total_amount`.

| Stat | Query |
| --- | --- |
| Total Payments Received | `SUM(total_amount) WHERE payment_status = 'Paid'`, formatted with the aggregate's own currency |
| Pending Payments | `COUNT(*) WHERE payment_status = 'Unpaid'` |
| Failed Payments | `COUNT(*) WHERE payment_status = 'Failed'` |

**Failed Payments will read 0 until a real payment-failure path exists.**
`'Failed'` is a real, migrated value on `orders.payment_status` (see
`docs/orders/orders-payment-status-failed-only.sql`), but nothing in the app
currently creates orders or records payment attempts (no checkout/payment
flow is wired up yet), so no row can carry that status today. The stat is
genuinely DB-connected rather than hardcoded — it will start reporting real
numbers as soon as that flow is built, with no change needed here.

The store is treated as single-currency in practice (`MIN(currency)` across
matching rows); this does not convert or split out multiple currencies.

## Charts

Each section also renders a Chart.js doughnut breakdown next to its stat
grid (`src/components/reports/ReportDoughnutChart.js`, theme-aware the same
way as the dashboard's `SalesChart.js`). Each chart only plots
mutually-exclusive categories of a single column so the slices add up to a
meaningful whole:

| Section | Chart | Categories (single column, no overlap) |
| --- | --- | --- |
| Order Reports | Orders by Status | `status`: Completed / Pending / Processing / Cancelled |
| Product Reports | Products by Stock Level | derived stock band: In Stock / Low Stock / Out of Stock |
| Payment Reports | Orders by Payment Status | `payment_status`: Paid / Unpaid / Refunded / Failed |

"Refunded Orders" (a `payment_status` value) is intentionally left out of the
**Orders by Status** chart — it's not a value of the `status` column, so
including it there would double-count an order that's already counted under
its Cancelled slice. It appears instead in the **Orders by Payment Status**
chart, where `payment_status` is the single column being broken down.

## Access control

No new permissions code — `reports` was already a pre-registered module in
`src/lib/permissions.js` (`alwaysInclude: true`, actions `view`/`export`).
Adding the `id: "reports"` nav item in `src/config/admin-panel.config.js`
auto-binds to it. A full-access role (Super Admin) gets every permission,
including `reports.view`/`reports.export`, automatically. Any other role's
access is granted/revoked the same way as every other module: Settings →
Admin & Roles.
