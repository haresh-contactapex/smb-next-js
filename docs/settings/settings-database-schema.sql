-- ============================================================================
-- Settings Database Schema
-- Generated from settings-database-schema.md
--
-- Dialect: PostgreSQL
--
-- Notes:
--   * Eighteen of the tables below are "singletons": exactly one row
--     (id SMALLINT PRIMARY KEY CHECK (id = 1)) holding that whole settings
--     page's fields. admin_invitations is the one true multi-row table.
--   * `admin_invitations.invited_by` references `users.id`, which is defined
--     in the My Account schema and is NOT created here. Create that table
--     first, or drop the FK constraint below if this script runs standalone.
--   * `payment_settings.secret_key` and `email_settings.smtp_password` are
--     credentials and should be stored encrypted at rest (e.g. pgcrypto or
--     an application-level KMS) rather than as plain VARCHAR, even though
--     they are typed as VARCHAR here to mirror the current UI's plain
--     TextField/password inputs.
--   * Discounts & Coupons (`coupon_settings`) is defined in the separate
--     vouchers-coupons schema and is not repeated here.
-- ============================================================================

-- Required for gen_random_uuid() used by admin_invitations.id
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

BEGIN;

-- ----------------------------------------------------------------------------
-- General
-- ----------------------------------------------------------------------------
CREATE TABLE general_settings (
    id               SMALLINT PRIMARY KEY CHECK (id = 1),
    store_name       VARCHAR(150) NOT NULL DEFAULT 'Shop My Band',
    logo_url         TEXT,
    favicon_url      TEXT,
    store_email      VARCHAR(255) NOT NULL DEFAULT 'hello@shopmyband.com',
    phone            VARCHAR(20),
    address          VARCHAR(255),
    country          VARCHAR(100) NOT NULL DEFAULT 'United States',
    state            VARCHAR(100),
    city             VARCHAR(100),
    timezone         VARCHAR(20)  NOT NULL DEFAULT 'UTC+05:30',
    date_time_format VARCHAR(20)  NOT NULL DEFAULT 'MM/DD/YYYY 12h',
    language         VARCHAR(5)   NOT NULL DEFAULT 'en',
    currency         VARCHAR(3)   NOT NULL DEFAULT 'USD',
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON TABLE general_settings IS 'Backs the Settings -> General page. Singleton row (id = 1).';

-- ----------------------------------------------------------------------------
-- Store
-- ----------------------------------------------------------------------------
CREATE TABLE store_settings (
    id                  SMALLINT PRIMARY KEY CHECK (id = 1),
    legal_business_name VARCHAR(200),
    business_type       VARCHAR(20) NOT NULL DEFAULT 'LLC'
        CHECK (business_type IN ('Sole Proprietorship', 'LLC', 'Corporation', 'Partnership', 'Other')),
    store_url           VARCHAR(255),
    tax_id              VARCHAR(50),
    support_email       VARCHAR(255),
    support_phone       VARCHAR(20),
    support_hours       VARCHAR(100),
    store_is_live       BOOLEAN NOT NULL DEFAULT true,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE store_settings IS 'Backs the Settings -> Store page. Singleton row (id = 1).';
COMMENT ON COLUMN store_settings.store_is_live IS 'Storefront on/off switch.';

-- ----------------------------------------------------------------------------
-- Currency & Tax
-- ----------------------------------------------------------------------------
CREATE TABLE currency_tax_settings (
    id                       SMALLINT PRIMARY KEY CHECK (id = 1),
    currency                 VARCHAR(3)   NOT NULL DEFAULT 'USD',
    currency_position        VARCHAR(6)   NOT NULL DEFAULT 'before'
        CHECK (currency_position IN ('before', 'after')),
    number_format            VARCHAR(10)  NOT NULL DEFAULT '1,234.56'
        CHECK (number_format IN ('1,234.56', '1.234,56', '1 234.56')),
    prices_include_tax       BOOLEAN      NOT NULL DEFAULT false,
    default_tax_rate         DECIMAL(5,2) NOT NULL DEFAULT 8.25,
    tax_registration_number  VARCHAR(50),
    apply_tax_to_shipping    BOOLEAN      NOT NULL DEFAULT true,
    enable_tax_exempt_groups BOOLEAN      NOT NULL DEFAULT false,
    updated_at               TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON TABLE currency_tax_settings IS 'Backs the Settings -> Currency & Tax page. Singleton row (id = 1).';
COMMENT ON COLUMN currency_tax_settings.currency IS 'The store-wide currency, applied globally across the app. general_settings.currency is unused.';

-- ----------------------------------------------------------------------------
-- Payment
-- ----------------------------------------------------------------------------
CREATE TABLE payment_settings (
    id               SMALLINT PRIMARY KEY CHECK (id = 1),
    stripe_enabled   BOOLEAN       NOT NULL DEFAULT true,
    paypal_enabled   BOOLEAN       NOT NULL DEFAULT false,
    razorpay_enabled BOOLEAN       NOT NULL DEFAULT false,
    cod_enabled      BOOLEAN       NOT NULL DEFAULT true,
    public_key       VARCHAR(255),
    secret_key       VARCHAR(255),
    transaction_fee  DECIMAL(5,2)  NOT NULL DEFAULT 2.9,
    cod_min_order    DECIMAL(12,2) NOT NULL DEFAULT 0,
    auto_capture     BOOLEAN       NOT NULL DEFAULT true,
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);
COMMENT ON TABLE payment_settings IS 'Backs the Settings -> Payment page. Singleton row (id = 1).';
COMMENT ON COLUMN payment_settings.cod_enabled IS 'Cash on delivery.';
COMMENT ON COLUMN payment_settings.public_key IS 'Gateway publishable key.';
COMMENT ON COLUMN payment_settings.secret_key IS 'Gateway secret key. Store encrypted at rest, never in plaintext.';
COMMENT ON COLUMN payment_settings.transaction_fee IS 'Percent per transaction.';
COMMENT ON COLUMN payment_settings.cod_min_order IS 'Minimum order amount to allow COD.';
COMMENT ON COLUMN payment_settings.auto_capture IS 'Capture payment immediately vs. authorize-only.';

-- ----------------------------------------------------------------------------
-- Shipping
-- ----------------------------------------------------------------------------
CREATE TABLE shipping_settings (
    id                       SMALLINT PRIMARY KEY CHECK (id = 1),
    default_carrier          VARCHAR(20) NOT NULL DEFAULT 'USPS'
        CHECK (default_carrier IN ('USPS', 'UPS', 'FedEx', 'DHL', 'Local Courier')),
    flat_rate_fee            DECIMAL(12,2) NOT NULL DEFAULT 5.99,
    free_shipping_threshold  DECIMAL(12,2) NOT NULL DEFAULT 75,
    processing_time_days     SMALLINT      NOT NULL DEFAULT 2,
    weight_unit              VARCHAR(2)    NOT NULL DEFAULT 'lb'
        CHECK (weight_unit IN ('lb', 'kg')),
    dimension_unit           VARCHAR(2)    NOT NULL DEFAULT 'in'
        CHECK (dimension_unit IN ('in', 'cm')),
    local_pickup_enabled     BOOLEAN       NOT NULL DEFAULT false,
    updated_at               TIMESTAMPTZ   NOT NULL DEFAULT now()
);
COMMENT ON TABLE shipping_settings IS 'Backs the Settings -> Shipping page. Singleton row (id = 1).';
COMMENT ON COLUMN shipping_settings.free_shipping_threshold IS 'Order subtotal at/above which shipping is free.';

-- ----------------------------------------------------------------------------
-- Orders
-- ----------------------------------------------------------------------------
CREATE TABLE orders_settings (
    id                        SMALLINT PRIMARY KEY CHECK (id = 1),
    order_number_prefix       VARCHAR(20) NOT NULL DEFAULT 'SMB-',
    starting_order_number     INTEGER     NOT NULL DEFAULT 10000,
    auto_cancel_hours         SMALLINT    NOT NULL DEFAULT 24 CHECK (auto_cancel_hours >= 24),
    default_order_status      VARCHAR(20) NOT NULL DEFAULT 'Pending'
        CHECK (default_order_status IN ('Pending', 'Processing', 'Completed')),
    require_confirmation_email BOOLEAN    NOT NULL DEFAULT true,
    allow_order_edits         BOOLEAN     NOT NULL DEFAULT false,
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE orders_settings IS 'Backs the Settings -> Orders page. Singleton row (id = 1).';
COMMENT ON COLUMN orders_settings.starting_order_number IS 'Seed value for the next generated order number.';
COMMENT ON COLUMN orders_settings.auto_cancel_hours IS 'Auto-cancel unpaid orders after this many hours. Minimum 24.';
COMMENT ON COLUMN orders_settings.allow_order_edits IS 'Whether admins can edit an order after it''s placed.';

-- ----------------------------------------------------------------------------
-- Customers
-- ----------------------------------------------------------------------------
CREATE TABLE customers_settings (
    id                          SMALLINT PRIMARY KEY CHECK (id = 1),
    allow_guest_checkout        BOOLEAN     NOT NULL DEFAULT true,
    require_email_verification  BOOLEAN     NOT NULL DEFAULT true,
    allow_self_delete_account   BOOLEAN     NOT NULL DEFAULT false,
    default_customer_group      VARCHAR(20) NOT NULL DEFAULT 'Retail'
        CHECK (default_customer_group IN ('Retail', 'Wholesale', 'VIP')),
    enable_loyalty_points       BOOLEAN     NOT NULL DEFAULT false,
    default_marketing_consent   BOOLEAN     NOT NULL DEFAULT false,
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE customers_settings IS 'Backs the Settings -> Customers page. Singleton row (id = 1).';
COMMENT ON COLUMN customers_settings.allow_guest_checkout IS 'Duplicated on checkout_settings; two independent forms in the current UI.';
COMMENT ON COLUMN customers_settings.default_marketing_consent IS 'Pre-checked state of the marketing opt-in at signup.';

-- ----------------------------------------------------------------------------
-- Products
-- ----------------------------------------------------------------------------
CREATE TABLE products_settings (
    id                   SMALLINT PRIMARY KEY CHECK (id = 1),
    sku_prefix           VARCHAR(20),
    default_status       VARCHAR(10) NOT NULL DEFAULT 'draft'
        CHECK (default_status IN ('draft', 'published')),
    default_weight_unit  VARCHAR(2)  NOT NULL DEFAULT 'lb'
        CHECK (default_weight_unit IN ('lb', 'kg')),
    allow_backorders     BOOLEAN     NOT NULL DEFAULT false,
    allow_reviews        BOOLEAN     NOT NULL DEFAULT true,
    show_low_stock_badge BOOLEAN     NOT NULL DEFAULT true,
    low_stock_threshold  INTEGER     NOT NULL DEFAULT 5,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE products_settings IS 'Backs the Settings -> Products page. Singleton row (id = 1).';
COMMENT ON COLUMN products_settings.default_status IS 'Status a new product is created with.';
COMMENT ON COLUMN products_settings.low_stock_threshold IS 'Duplicated on inventory_settings; two independent forms in the current UI.';

-- ----------------------------------------------------------------------------
-- Inventory
-- ----------------------------------------------------------------------------
CREATE TABLE inventory_settings (
    id                    SMALLINT PRIMARY KEY CHECK (id = 1),
    track_inventory       BOOLEAN     NOT NULL DEFAULT true,
    low_stock_threshold   INTEGER     NOT NULL DEFAULT 5,
    out_of_stock_behavior VARCHAR(20) NOT NULL DEFAULT 'Hide product'
        CHECK (out_of_stock_behavior IN ('Hide product', 'Show as sold out', 'Allow backorder')),
    multiple_warehouses   BOOLEAN     NOT NULL DEFAULT false,
    email_on_low_stock    BOOLEAN     NOT NULL DEFAULT true,
    restock_alert_email   VARCHAR(255),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE inventory_settings IS 'Backs the Settings -> Inventory page. Singleton row (id = 1).';
COMMENT ON COLUMN inventory_settings.low_stock_threshold IS 'Duplicated on products_settings; two independent forms in the current UI.';

-- ----------------------------------------------------------------------------
-- Checkout
-- ----------------------------------------------------------------------------
CREATE TABLE checkout_settings (
    id                         SMALLINT PRIMARY KEY CHECK (id = 1),
    allow_guest_checkout       BOOLEAN       NOT NULL DEFAULT true,
    require_phone              BOOLEAN       NOT NULL DEFAULT false,
    require_terms              BOOLEAN       NOT NULL DEFAULT true,
    minimum_order_amount       DECIMAL(12,2) NOT NULL DEFAULT 0,
    send_abandoned_cart_emails BOOLEAN       NOT NULL DEFAULT true,
    reminder_delay_hours       SMALLINT      NOT NULL DEFAULT 4,
    updated_at                 TIMESTAMPTZ   NOT NULL DEFAULT now()
);
COMMENT ON TABLE checkout_settings IS 'Backs the Settings -> Checkout page. Singleton row (id = 1).';
COMMENT ON COLUMN checkout_settings.allow_guest_checkout IS 'Duplicated on customers_settings; two independent forms in the current UI.';
COMMENT ON COLUMN checkout_settings.reminder_delay_hours IS 'Delay before the first abandoned-cart email.';

-- ----------------------------------------------------------------------------
-- Returns & Refunds
-- ----------------------------------------------------------------------------
CREATE TABLE returns_refunds_settings (
    id                      SMALLINT PRIMARY KEY CHECK (id = 1),
    return_window_days      SMALLINT     NOT NULL DEFAULT 30,
    restocking_fee_percent  DECIMAL(5,2) NOT NULL DEFAULT 0,
    allow_exchanges         BOOLEAN      NOT NULL DEFAULT true,
    refund_method           VARCHAR(30)  NOT NULL DEFAULT 'Original payment method'
        CHECK (refund_method IN ('Original payment method', 'Store credit', 'Either')),
    return_shipping_paid_by VARCHAR(10)  NOT NULL DEFAULT 'Customer'
        CHECK (return_shipping_paid_by IN ('Customer', 'Store')),
    auto_approve_returns    BOOLEAN      NOT NULL DEFAULT false,
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON TABLE returns_refunds_settings IS 'Backs the Settings -> Returns & Refunds page. Singleton row (id = 1).';

-- ----------------------------------------------------------------------------
-- Email
-- ----------------------------------------------------------------------------
CREATE TABLE email_settings (
    id                                 SMALLINT PRIMARY KEY CHECK (id = 1),
    smtp_host                          VARCHAR(255),
    smtp_port                          INTEGER,
    smtp_username                      VARCHAR(255),
    smtp_password                      VARCHAR(255),
    sender_name                        VARCHAR(150),
    sender_email                       VARCHAR(255),
    send_order_confirmation_emails     BOOLEAN     NOT NULL DEFAULT true,
    send_shipping_notification_emails  BOOLEAN     NOT NULL DEFAULT true,
    send_marketing_emails              BOOLEAN     NOT NULL DEFAULT false,
    email_footer_text                  TEXT,
    updated_at                         TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE email_settings IS 'Backs the Settings -> Email page. Singleton row (id = 1).';
COMMENT ON COLUMN email_settings.smtp_password IS 'Should be stored encrypted, not plaintext.';

-- ----------------------------------------------------------------------------
-- Notifications
-- ----------------------------------------------------------------------------
CREATE TABLE notifications_settings (
    id                           SMALLINT PRIMARY KEY CHECK (id = 1),
    new_order_email_alert        BOOLEAN     NOT NULL DEFAULT true,
    low_stock_alert              BOOLEAN     NOT NULL DEFAULT true,
    new_customer_signup_alert    BOOLEAN     NOT NULL DEFAULT false,
    notification_recipient_email VARCHAR(255) NOT NULL DEFAULT 'admin@shopmyband.com',
    enable_sms_notifications     BOOLEAN     NOT NULL DEFAULT false,
    enable_push_notifications    BOOLEAN     NOT NULL DEFAULT false,
    toast_timeout_seconds        SMALLINT    NOT NULL DEFAULT 3 CHECK (toast_timeout_seconds BETWEEN 1 AND 30),
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE notifications_settings IS 'Backs the Settings -> Notifications page. Singleton row (id = 1).';
COMMENT ON COLUMN notifications_settings.notification_recipient_email IS 'Where the alerts above are sent.';
COMMENT ON COLUMN notifications_settings.toast_timeout_seconds IS 'How long admin toast notifications stay visible before auto-dismissing. 1-30 seconds.';

-- ----------------------------------------------------------------------------
-- SEO
-- ----------------------------------------------------------------------------
CREATE TABLE seo_settings (
    id                        SMALLINT PRIMARY KEY CHECK (id = 1),
    default_meta_title        VARCHAR(70),
    default_meta_description  VARCHAR(320),
    google_analytics_id       VARCHAR(30),
    facebook_pixel_id         VARCHAR(30),
    generate_xml_sitemap      BOOLEAN     NOT NULL DEFAULT true,
    robots_txt_content        TEXT,
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE seo_settings IS 'Backs the Settings -> SEO page. Singleton row (id = 1).';

-- ----------------------------------------------------------------------------
-- Security
-- ----------------------------------------------------------------------------
CREATE TABLE security_settings (
    id                      SMALLINT PRIMARY KEY CHECK (id = 1),
    require_two_factor_auth BOOLEAN     NOT NULL DEFAULT false,
    session_timeout_minutes SMALLINT    NOT NULL DEFAULT 30 CHECK (session_timeout_minutes >= 1),
    password_expiry_days    SMALLINT    NOT NULL DEFAULT 90 CHECK (password_expiry_days >= 1),
    max_login_attempts      SMALLINT    NOT NULL DEFAULT 5  CHECK (max_login_attempts >= 1),
    ip_allowlist            TEXT,
    enable_recaptcha        BOOLEAN     NOT NULL DEFAULT true,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE security_settings IS 'Backs the Settings -> Security page. Singleton row (id = 1).';
COMMENT ON COLUMN security_settings.require_two_factor_auth IS 'Store-wide 2FA requirement; distinct from the per-user users.two_factor_enabled toggle.';
COMMENT ON COLUMN security_settings.session_timeout_minutes IS 'Required in the UI. Minutes of inactivity before an admin session expires.';
COMMENT ON COLUMN security_settings.password_expiry_days IS 'Required in the UI. Days before an admin password must be changed.';
COMMENT ON COLUMN security_settings.max_login_attempts IS 'Required in the UI. Failed sign-in attempts allowed before lockout.';
COMMENT ON COLUMN security_settings.ip_allowlist IS 'Optional. Newline-separated IPs/CIDRs, mirroring the textarea in the UI ("one per line").';

-- ----------------------------------------------------------------------------
-- Admin & Roles: invitations (non-singleton) + role permission matrix (singleton)
-- ----------------------------------------------------------------------------
CREATE TABLE admin_invitations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) NOT NULL,
    role        VARCHAR(20)  NOT NULL DEFAULT 'Staff'
        CHECK (role IN ('Owner', 'Manager', 'Staff', 'Support')),
    invited_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    status      VARCHAR(10)  NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')),
    invited_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ  NOT NULL,
    accepted_at TIMESTAMPTZ
);
COMMENT ON TABLE admin_invitations IS 'Backs the Invite Admin form on Settings -> Admin & Roles. Not a singleton: each invite is a new row.';
COMMENT ON COLUMN admin_invitations.invited_by IS 'The admin who sent the invite.';
COMMENT ON COLUMN admin_invitations.expires_at IS 'Typically invited_at + 7 days.';
COMMENT ON COLUMN admin_invitations.accepted_at IS 'Set when the invitee creates their account.';

CREATE INDEX idx_admin_invitations_email ON admin_invitations (email);
CREATE INDEX idx_admin_invitations_status ON admin_invitations (status);

CREATE TABLE role_permissions_settings (
    id                           SMALLINT PRIMARY KEY CHECK (id = 1),
    staff_manage_products        BOOLEAN NOT NULL DEFAULT true,
    staff_manage_orders          BOOLEAN NOT NULL DEFAULT true,
    staff_manage_discounts       BOOLEAN NOT NULL DEFAULT false,
    staff_view_financial_reports BOOLEAN NOT NULL DEFAULT false,
    manager_manage_admins        BOOLEAN NOT NULL DEFAULT false,
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE role_permissions_settings IS 'Backs the Role Permissions toggle group on Settings -> Admin & Roles. Singleton row (id = 1): one shared matrix, not per-admin overrides.';

-- ----------------------------------------------------------------------------
-- Integrations
-- ----------------------------------------------------------------------------
CREATE TABLE integrations_settings (
    id                        SMALLINT PRIMARY KEY CHECK (id = 1),
    google_analytics_enabled  BOOLEAN     NOT NULL DEFAULT true,
    google_analytics_id       VARCHAR(30),
    meta_pixel_enabled        BOOLEAN     NOT NULL DEFAULT false,
    meta_pixel_id             VARCHAR(30),
    mailchimp_enabled         BOOLEAN     NOT NULL DEFAULT false,
    mailchimp_api_key         VARCHAR(255),
    google_recaptcha_enabled    BOOLEAN     NOT NULL DEFAULT false,
    google_recaptcha_site_key   VARCHAR(255),
    google_recaptcha_secret_key VARCHAR(255),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE integrations_settings IS 'Backs the Settings -> Integrations page. Singleton row (id = 1).';
COMMENT ON COLUMN integrations_settings.google_analytics_id IS 'Measurement ID, e.g. G-XXXXXXXXXX. Required when google_analytics_enabled is true.';
COMMENT ON COLUMN integrations_settings.meta_pixel_id IS 'Numeric Pixel ID. Required when meta_pixel_enabled is true.';
COMMENT ON COLUMN integrations_settings.mailchimp_api_key IS 'Mailchimp API key, e.g. {32 hex chars}-us21. Required when mailchimp_enabled is true.';
COMMENT ON COLUMN integrations_settings.google_recaptcha_site_key IS 'Google reCAPTCHA site key. Required when google_recaptcha_enabled is true.';
COMMENT ON COLUMN integrations_settings.google_recaptcha_secret_key IS 'Google reCAPTCHA secret key, used server-side to verify challenge responses. Required when google_recaptcha_enabled is true; should be stored encrypted, not plaintext.';

-- ----------------------------------------------------------------------------
-- Social Media
-- ----------------------------------------------------------------------------
CREATE TABLE social_media_settings (
    id                 SMALLINT PRIMARY KEY CHECK (id = 1),
    facebook_url       VARCHAR(255),
    instagram_url      VARCHAR(255),
    twitter_url        VARCHAR(255),
    pinterest_url      VARCHAR(255),
    tiktok_url         VARCHAR(255),
    youtube_url        VARCHAR(255),
    show_share_buttons BOOLEAN     NOT NULL DEFAULT true,
    show_footer_links  BOOLEAN     NOT NULL DEFAULT true,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE social_media_settings IS 'Backs the Settings -> Social Media page. Singleton row (id = 1).';
COMMENT ON COLUMN social_media_settings.show_share_buttons IS 'Storefront social-share buttons.';
COMMENT ON COLUMN social_media_settings.show_footer_links IS 'Storefront footer social icons.';

-- ----------------------------------------------------------------------------
-- Legal
-- ----------------------------------------------------------------------------
CREATE TABLE legal_settings (
    id                  SMALLINT PRIMARY KEY CHECK (id = 1),
    terms_url           VARCHAR(255),
    privacy_url         VARCHAR(255),
    refund_url          VARCHAR(255),
    shipping_policy_url VARCHAR(255),
    show_cookie_banner  BOOLEAN     NOT NULL DEFAULT true,
    legal_address       TEXT,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE legal_settings IS 'Backs the Settings -> Legal page. Singleton row (id = 1).';
COMMENT ON COLUMN legal_settings.legal_address IS 'Registered business address for legal notices.';

-- ----------------------------------------------------------------------------
-- System & Maintenance
-- ----------------------------------------------------------------------------
CREATE TABLE system_maintenance_settings (
    id                        SMALLINT PRIMARY KEY CHECK (id = 1),
    maintenance_mode_enabled BOOLEAN     NOT NULL DEFAULT false,
    maintenance_message      TEXT,
    debug_mode_enabled       BOOLEAN     NOT NULL DEFAULT false,
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE system_maintenance_settings IS 'Backs the Settings -> System & Maintenance page. Excludes read-only System Info and the Back Up Now / Clear Cache actions. Singleton row (id = 1).';
COMMENT ON COLUMN system_maintenance_settings.maintenance_message IS 'Shown to storefront visitors while maintenance mode is on.';

COMMIT;

-- ============================================================================
-- Seed the singleton row (id = 1) for every settings table so each page has
-- a row to read/update from the moment the app starts.
-- ============================================================================
BEGIN;

INSERT INTO general_settings (id) VALUES (1);
INSERT INTO store_settings (id) VALUES (1);
INSERT INTO currency_tax_settings (id) VALUES (1);
INSERT INTO payment_settings (id) VALUES (1);
INSERT INTO shipping_settings (id) VALUES (1);
INSERT INTO orders_settings (id) VALUES (1);
INSERT INTO customers_settings (id) VALUES (1);
INSERT INTO products_settings (id) VALUES (1);
INSERT INTO inventory_settings (id) VALUES (1);
INSERT INTO checkout_settings (id) VALUES (1);
INSERT INTO returns_refunds_settings (id) VALUES (1);
INSERT INTO email_settings (id) VALUES (1);
INSERT INTO notifications_settings (id) VALUES (1);
INSERT INTO seo_settings (id) VALUES (1);
INSERT INTO security_settings (id) VALUES (1);
INSERT INTO role_permissions_settings (id) VALUES (1);
INSERT INTO integrations_settings (id) VALUES (1);
INSERT INTO social_media_settings (id) VALUES (1);
INSERT INTO legal_settings (id) VALUES (1);
INSERT INTO system_maintenance_settings (id) VALUES (1);
-- admin_invitations is intentionally NOT seeded: it starts empty and rows
-- are created only when an invite is sent.

COMMIT;
