-- Security settings table only (subset of settings-database-schema.sql)
-- Backs the Settings -> Security page without requiring the other
-- settings tables from the full Settings schema.
-- Dialect: PostgreSQL

CREATE TABLE IF NOT EXISTS security_settings (
    id                       SMALLINT PRIMARY KEY CHECK (id = 1),
    require_two_factor_auth BOOLEAN     NOT NULL DEFAULT false,
    session_timeout_minutes SMALLINT    NOT NULL DEFAULT 30  CHECK (session_timeout_minutes >= 1),
    password_expiry_days    SMALLINT    NOT NULL DEFAULT 90  CHECK (password_expiry_days >= 1),
    max_login_attempts      SMALLINT    NOT NULL DEFAULT 5   CHECK (max_login_attempts >= 1),
    ip_allowlist             TEXT,
    enable_recaptcha        BOOLEAN     NOT NULL DEFAULT true,
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE security_settings IS 'Backs the Settings -> Security page. Singleton row (id = 1).';
COMMENT ON COLUMN security_settings.require_two_factor_auth IS 'Store-wide 2FA requirement; distinct from the per-user users.two_factor_enabled toggle.';
COMMENT ON COLUMN security_settings.session_timeout_minutes IS 'Required in the UI. Minutes of inactivity before an admin session expires.';
COMMENT ON COLUMN security_settings.password_expiry_days IS 'Required in the UI. Days before an admin password must be changed.';
COMMENT ON COLUMN security_settings.max_login_attempts IS 'Required in the UI. Failed sign-in attempts allowed before lockout.';
COMMENT ON COLUMN security_settings.ip_allowlist IS 'Optional. Newline-separated IPs/CIDRs, mirroring the textarea in the UI ("one per line").';

INSERT INTO security_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
