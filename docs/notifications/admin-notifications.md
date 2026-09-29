# Admin notifications

Schema: `admin-notifications-table-only.sql` (`npm run db:migrate:admin-notifications`).

- `admin_notifications` — one row per activity. Visibility is decided by `audience_permission` (a permission key from `src/lib/permissions.js`) or `target_user_id`; full-access roles see all.
- `admin_notification_reads` — per-admin `read_at` / `dismissed_at`. "Mark read" and "Clear all" only ever touch the caller's rows.

Write path: `logAdminActivity()` (`src/lib/notifications.js`) → insert → best-effort `POST /publish` to the WebSocket server (`scripts/notifications-ws-server.mjs`), which re-checks each connected admin's role from the database before sending.

Environment: `NOTIFICATIONS_WS_URL` (public ws/wss URL handed to browsers), `NOTIFICATIONS_WS_PUBLISH_URL` (internal http URL of the WS server), `NOTIFICATIONS_WS_SECRET` (shared publish secret), `NOTIFICATIONS_WS_ALLOWED_ORIGINS`, `NOTIFICATIONS_WS_PORT`. Without them the bell falls back to polling every 30s.
