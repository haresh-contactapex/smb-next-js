-- Admin notification centre: activity events + per-admin read/dismiss state.
-- Apply with: npm run db:migrate:admin-notifications
-- Requires the staff `users` table (db:migrate:staff-users). Dialect: PostgreSQL

CREATE TABLE IF NOT EXISTS admin_notifications (
    id                   BIGSERIAL PRIMARY KEY,
    actor_user_id        UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    actor_name           VARCHAR(150) NULL,
    action               VARCHAR(80) NOT NULL,
    entity_type          VARCHAR(40) NULL,
    entity_id            VARCHAR(80) NULL,
    title                VARCHAR(200) NOT NULL,
    description          TEXT NULL,
    severity             VARCHAR(10) NOT NULL DEFAULT 'info',
    metadata             JSONB NOT NULL DEFAULT '{}'::jsonb,
    audience_permission  VARCHAR(80) NULL,
    target_user_id       UUID NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT admin_notifications_severity_check CHECK (severity IN ('info', 'success', 'warning', 'error'))
);

CREATE INDEX IF NOT EXISTS admin_notifications_created_idx ON admin_notifications (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS admin_notifications_audience_idx ON admin_notifications (audience_permission, id DESC);
CREATE INDEX IF NOT EXISTS admin_notifications_target_idx ON admin_notifications (target_user_id, id DESC) WHERE target_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS admin_notifications_entity_idx ON admin_notifications (entity_type, entity_id);

CREATE TABLE IF NOT EXISTS admin_notification_reads (
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_id  BIGINT NOT NULL REFERENCES admin_notifications(id) ON DELETE CASCADE,
    read_at          TIMESTAMPTZ NULL,
    dismissed_at     TIMESTAMPTZ NULL,

    PRIMARY KEY (user_id, notification_id)
);

CREATE INDEX IF NOT EXISTS admin_notification_reads_notification_idx ON admin_notification_reads (notification_id);

COMMENT ON COLUMN admin_notifications.audience_permission IS 'Permission key ("products.view") a role needs to see this notification. Full-access roles see everything. NULL means only full-access roles and target_user_id.';
COMMENT ON COLUMN admin_notifications.target_user_id IS 'Optional direct recipient; always visible to that admin regardless of role.';
COMMENT ON COLUMN admin_notifications.metadata IS 'Sanitized context only. logAdminActivity() strips passwords, tokens, card and payment data.';
COMMENT ON COLUMN admin_notification_reads.dismissed_at IS 'Set by Clear all / clear one: hides the notification for this admin only.';
