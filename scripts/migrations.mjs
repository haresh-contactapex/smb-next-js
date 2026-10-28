// Every schema file, in the order a fresh database needs them (a table is created before
// anything that references it). `npm run db:migrate:all` applies the ones not yet recorded
// in schema_migrations; add a new feature's file here when it is created.
export const MIGRATIONS = [
  "docs/category-product/category-product-catalog-database-schema.sql",
  "docs/media/media-library-schema.sql",
  "docs/category-product/product-categories-table-only.sql",
  "docs/auth/customers-table-only.sql",
  "docs/my-account/users-table-only.sql",
  "docs/my-account/addresses-table-only.sql",
  "docs/auth/session-revocation-only.sql",
  "docs/auth/customer-login-lockout-only.sql",
  "docs/my-account/users-security-columns-only.sql",
  "docs/auth/auth-database-schema.sql",
  "docs/my-account/staff-login-otp-table-only.sql",
  "docs/settings/security-table-only.sql",
  "docs/auth/customer-two-factor-only.sql",
  "docs/orders/orders-table-only.sql",
  "docs/auth/customers-unique-email-only.sql",
  "docs/orders/order-details-tables-only.sql",
  "docs/orders/order-note-column-only.sql",
  "docs/orders/orders-payment-status-failed-only.sql",
  "docs/vouchers-coupons/coupons-table-only.sql",
  "docs/vouchers-coupons/coupon-redemptions-only.sql",
  "docs/reviews/reviews-table-only.sql",
  "docs/reviews/reviews-half-star-ratings-only.sql",
  "docs/cms/cms-pages-table-only.sql",
  "docs/cms/footer-texts-table-only.sql",
  "docs/blog/blog-posts-table-only.sql",
  "docs/engraving/engraving-tables-only.sql",
  "docs/storefront/wishlist-table-only.sql",
  "docs/account/customer-account-tables-only.sql",
  "docs/settings/general-store-tables-only.sql",
  "docs/settings/orders-table-only.sql",
  "docs/settings/currency-tax-table-only.sql",
  "docs/settings/shipping-table-only.sql",
  "docs/settings/payment-table-only.sql",
  "docs/settings/payment-stripe-webhook-secret-only.sql",
  "docs/settings/email-table-only.sql",
  "docs/settings/email-order-status-emails-only.sql",
  "docs/settings/checkout-table-only.sql",
  "docs/settings/products-table-only.sql",
  "docs/settings/pricing-table-only.sql",
  "docs/settings/integrations-table-only.sql",
  "docs/settings/notifications-table-only.sql",
  "docs/settings/system-maintenance-table-only.sql",
  "docs/settings/social-media-table-only.sql",
  "docs/settings/admin-roles-table-only.sql",
  "docs/notifications/admin-notifications-table-only.sql",
];

// One-off upgrades that must not run on a fresh database. payment-gateway-credentials-only.sql
// is for databases whose payment_settings still has the old shared public_key/secret_key
// columns (run it by hand with `npm run db:migrate:payment-gateways` only on such a database).
// tests/migrations.test.mjs checks that every `db:migrate:*` script's file is in one list or the other.
export const MANUAL_ONLY = ["docs/settings/payment-gateway-credentials-only.sql"];

// The full per-area schemas the *-only files above were cut from. They are documentation: their
// CREATE TABLE statements are not IF NOT EXISTS, so the runner never applies them.
export const REFERENCE_ONLY = [
  "docs/my-account/my-account-database-schema.sql",
  "docs/orders/orders-database-schema.sql",
  "docs/settings/settings-database-schema.sql",
  "docs/vouchers-coupons/vouchers-coupons-database-schema.sql",
];
