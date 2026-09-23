-- Settings -> Admin & Roles: administrator roles and their permissions
-- (subset of settings-database-schema.sql).
-- Staff accounts reference a role through users.role = admin_roles.slug, so
-- the slug is fixed once created; renaming a role only changes its name.
-- Dialect: PostgreSQL

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- provides gen_random_uuid()

CREATE TABLE IF NOT EXISTS admin_roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            VARCHAR(60) NOT NULL,
    name            VARCHAR(100) NOT NULL,
    description     TEXT NULL,
    status          VARCHAR(10) NOT NULL DEFAULT 'active',
    is_system       BOOLEAN NOT NULL DEFAULT false,
    full_access     BOOLEAN NOT NULL DEFAULT false,
    permissions     JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT admin_roles_slug_key UNIQUE (slug),
    CONSTRAINT admin_roles_status_check CHECK (status IN ('active', 'inactive')),
    CONSTRAINT admin_roles_permissions_is_array CHECK (jsonb_typeof(permissions) = 'array')
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_roles_name_lower_key ON admin_roles (lower(name));

COMMENT ON COLUMN admin_roles.slug IS 'Stable identifier stored in users.role. Never changes after creation.';
COMMENT ON COLUMN admin_roles.is_system IS 'System-critical role (Super Admin): cannot be deleted, deactivated, renamed or have its permissions changed.';
COMMENT ON COLUMN admin_roles.full_access IS 'Grants every permission, including modules added to the sidebar later; permissions is ignored.';
COMMENT ON COLUMN admin_roles.permissions IS 'JSON array of "module.action" keys, e.g. ["products.view", "products.edit"]. Modules come from src/lib/permissions.js.';

-- Example roles. Super Admin reuses the existing "store_admin" slug so staff
-- accounts created by db:seed:admin become Super Admins automatically.
INSERT INTO admin_roles (slug, name, description, status, is_system, full_access, permissions) VALUES
    ('store_admin', 'Super Admin', 'Full system access, including modules added later. Cannot be deleted.', 'active', true, true, '[]'::jsonb),
    ('store_manager', 'Store Manager', 'Runs day-to-day store operations: products, orders, customers, inventory, coupons and reports. No user or role management.', 'active', false, false,
        '["dashboard.view","products.view","products.create","products.edit","products.delete","products.import","products.export","orders.view","orders.create","orders.edit","orders.cancel","orders.refund","orders.export","customers.view","customers.create","customers.edit","customers.delete","customers.export","inventory.view","inventory.edit","inventory.import","inventory.export","coupons.view","coupons.create","coupons.edit","coupons.delete","reports.view","reports.export"]'::jsonb),
    ('product_manager', 'Product Manager', 'Manages the catalog: products, categories and inventory, including product import/export.', 'active', false, false,
        '["dashboard.view","products.view","products.create","products.edit","products.delete","products.import","products.export","categories.view","categories.create","categories.edit","categories.delete","inventory.view","inventory.edit","inventory.import","inventory.export"]'::jsonb),
    ('order_manager', 'Order Manager', 'Handles orders and customers, including cancellations and refunds.', 'active', false, false,
        '["dashboard.view","orders.view","orders.create","orders.edit","orders.cancel","orders.refund","orders.export","customers.view","customers.create","customers.edit","customers.export"]'::jsonb),
    ('content_manager', 'Content Manager', 'Manages CMS content and moderates product reviews.', 'active', false, false,
        '["dashboard.view","content.view","content.create","content.edit","content.delete","content.publish","reviews.view","reviews.approve","reviews.edit","reviews.delete"]'::jsonb),
    ('support_agent', 'Support Agent', 'Views customers and orders with limited editing to resolve support requests.', 'active', false, false,
        '["dashboard.view","customers.view","customers.edit","orders.view","orders.edit"]'::jsonb)
ON CONFLICT (slug) DO NOTHING;
