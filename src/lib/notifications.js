import { sql, sqlQuery } from "./db";
import { getAdminRoleBySlug } from "./adminRoles";
import { MANAGE_ROLES_PERMISSION, settingsPermission } from "./permissions";

/**
 * Admin notification centre: activity logging (logAdminActivity) plus the
 * per-admin read/list/clear operations behind /api/notifications.
 *
 * Authorization is decided here, in SQL, from a *viewer* built server-side
 * out of the signed-in staff member's role (getNotificationViewer). Nothing
 * from the request (user id, role, permissions) is ever trusted. The same rule
 * lives in notificationAudience.mjs for the WebSocket server.
 */

export const ENTITY_TYPES = ["auth", "user", "role", "product", "category", "order", "customer", "coupon", "review", "media", "settings", "system"];
export const SEVERITIES = ["info", "success", "warning", "error"];
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

export class NotificationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// ---------- Audience ----------

const ENTITY_AUDIENCE = {
  product: "products.view",
  category: "categories.view",
  order: "orders.view",
  customer: "customers.view",
  coupon: "coupons.view",
  review: "reviews.view",
  media: "media.view",
  user: "users.view",
  role: MANAGE_ROLES_PERMISSION,
  auth: MANAGE_ROLES_PERMISSION,
  system: MANAGE_ROLES_PERMISSION,
};

// The permission a role needs to see an activity. Settings activities use the
// page's own View permission (entityId = settings page id). Custom roles work
// automatically: whoever holds the permission sees the notification.
export function defaultAudiencePermission(entityType, entityId) {
  if (entityType === "settings" && entityId) return settingsPermission(entityId, "view");
  return ENTITY_AUDIENCE[entityType] || MANAGE_ROLES_PERMISSION;
}

/**
 * The viewer every query is scoped to, built from the session user's role.
 * An inactive/missing role grants nothing beyond notifications targeted at
 * the user directly.
 */
export async function getNotificationViewer(user) {
  if (!user?.id) return null;
  let role = null;
  try {
    role = await getAdminRoleBySlug(user.role);
  } catch (error) {
    console.error("getNotificationViewer: failed to load role", error);
  }
  const active = role?.status === "active";
  return {
    userId: user.id,
    active,
    fullAccess: active && Boolean(role.fullAccess),
    permissions: active && Array.isArray(role.permissions) ? role.permissions : [],
  };
}

// $1 user id, $2 full access, $3 permission keys. Mirrors canViewNotification().
const VISIBLE_SQL = `(n.target_user_id = $1::uuid OR $2::boolean OR n.audience_permission = ANY($3::text[]))`;

function viewerParams(viewer) {
  return [viewer.userId, viewer.fullAccess, viewer.active ? viewer.permissions : []];
}

const SCOPED_FROM = `
  FROM admin_notifications n
  LEFT JOIN admin_notification_reads r ON r.notification_id = n.id AND r.user_id = $1::uuid
  WHERE ${VISIBLE_SQL} AND r.dismissed_at IS NULL`;

// ---------- Metadata sanitising ----------

const SENSITIVE_KEY = /pass(word)?|pwd|token|secret|api[-_]?key|authorization|cookie|session|card|cvv|cvc|\bpan\b|iban|account[-_]?number|routing|ssn|otp|payment|credential|hash|signature/i;
const JWT_LIKE = /\beyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]{8,}\b/g;
const CARD_LIKE = /\b(?:\d[ -]?){13,19}\b/g;
const MAX_METADATA_BYTES = 4000;

function sanitizeValue(value, depth) {
  if (value == null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") {
    return value.replace(JWT_LIKE, "[redacted]").replace(CARD_LIKE, "[redacted]").slice(0, 200);
  }
  if (depth >= 4) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeValue(item, depth + 1));
  if (typeof value === "object") {
    const out = {};
    for (const [key, item] of Object.entries(value).slice(0, 30)) {
      out[key] = SENSITIVE_KEY.test(key) ? "[redacted]" : sanitizeValue(item, depth + 1);
    }
    return out;
  }
  return String(value).slice(0, 200);
}

export function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") return {};
  const clean = sanitizeValue(metadata, 0);
  return JSON.stringify(clean).length > MAX_METADATA_BYTES ? { truncated: true } : clean;
}

// ---------- Logging ----------

function actorName(actor) {
  if (!actor) return null;
  const name = [actor.firstName, actor.lastName].filter(Boolean).join(" ").trim();
  return (name || actor.name || null)?.slice(0, 150) || null;
}

async function publishRealtime(id) {
  const base = process.env.NOTIFICATIONS_WS_PUBLISH_URL;
  const secret = process.env.NOTIFICATIONS_WS_SECRET;
  if (!base || !secret) return;
  try {
    await fetch(`${base.replace(/\/+$/, "")}/publish`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-internal-secret": secret },
      body: JSON.stringify({ id: String(id) }),
      signal: AbortSignal.timeout(1500),
    });
  } catch {
    // Realtime is best-effort: clients also refetch on reconnect and poll.
  }
}

/**
 * Record an admin activity and push it to authorized admins. Never throws —
 * logging must not break the action being logged. Returns the new id or null.
 *
 *   await logAdminActivity({
 *     actor: auth.user,             // staff user object (id, firstName, lastName) or null
 *     action: "product.created",    // "<entity>.<verb>"
 *     entityType: "product", entityId: id,
 *     title: 'Product "Ring" created',
 *     description, severity, metadata,
 *     audiencePermission,           // optional override of the per-entity default
 *     targetUserId,                 // optional direct recipient
 *   });
 */
export async function logAdminActivity({
  actor = null,
  action,
  entityType = null,
  entityId = null,
  title,
  description = null,
  severity = "info",
  metadata = {},
  audiencePermission,
  targetUserId = null,
}) {
  try {
    if (!action || !title) return null;
    const type = ENTITY_TYPES.includes(entityType) ? entityType : null;
    const entity = entityId == null ? null : String(entityId).slice(0, 80);
    const level = SEVERITIES.includes(severity) ? severity : "info";
    const audience = audiencePermission === undefined ? defaultAudiencePermission(type, entity) : audiencePermission;

    const [row] = await sql`
      INSERT INTO admin_notifications
        (actor_user_id, actor_name, action, entity_type, entity_id, title, description, severity, metadata, audience_permission, target_user_id)
      VALUES
        (${actor?.id || null}, ${actorName(actor)}, ${String(action).slice(0, 80)}, ${type}, ${entity},
         ${String(title).slice(0, 200)}, ${description ? String(description).slice(0, 1000) : null}, ${level},
         ${JSON.stringify(sanitizeMetadata(metadata))}::jsonb, ${audience || null}, ${targetUserId || null})
      RETURNING id
    `;
    await publishRealtime(row.id);
    if (Math.random() < 0.01) await pruneOldNotifications().catch(() => {});
    return String(row.id);
  } catch (error) {
    console.error("logAdminActivity failed", error);
    return null;
  }
}

// Retention: old notifications are deleted (reads cascade).
export async function pruneOldNotifications(days = 90) {
  await sql`DELETE FROM admin_notifications WHERE created_at < now() - make_interval(days => ${days})`;
}

// ---------- Reading ----------

export function toNotification(row) {
  return {
    id: String(row.id),
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    title: row.title,
    description: row.description || "",
    severity: row.severity,
    actorName: row.actor_name || "System",
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    read: Boolean(row.read_at),
  };
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export async function getUnreadCount(viewer) {
  const rows = await sqlQuery(`SELECT count(*)::int AS count ${SCOPED_FROM} AND r.read_at IS NULL`, viewerParams(viewer));
  return rows[0]?.count || 0;
}

export async function listNotifications(viewer, { page = 1, pageSize = DEFAULT_PAGE_SIZE, q = "", entityType = "", status = "all", severity = "" } = {}) {
  const size = Math.min(Math.max(Number.parseInt(pageSize, 10) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const current = Math.max(Number.parseInt(page, 10) || 1, 1);

  const params = viewerParams(viewer);
  let filters = "";
  const term = String(q || "").trim().slice(0, 100);
  if (term) {
    params.push(`%${escapeLike(term)}%`);
    filters += ` AND (n.title ILIKE $${params.length} OR n.description ILIKE $${params.length} OR n.actor_name ILIKE $${params.length})`;
  }
  if (ENTITY_TYPES.includes(entityType)) {
    params.push(entityType);
    filters += ` AND n.entity_type = $${params.length}`;
  }
  if (SEVERITIES.includes(severity)) {
    params.push(severity);
    filters += ` AND n.severity = $${params.length}`;
  }
  if (status === "unread") filters += " AND r.read_at IS NULL";
  else if (status === "read") filters += " AND r.read_at IS NOT NULL";

  const [countRows, rows, unreadCount] = await Promise.all([
    sqlQuery(`SELECT count(*)::int AS total ${SCOPED_FROM}${filters}`, params),
    sqlQuery(
      `SELECT n.*, r.read_at ${SCOPED_FROM}${filters} ORDER BY n.created_at DESC, n.id DESC LIMIT ${size} OFFSET ${(current - 1) * size}`,
      params
    ),
    getUnreadCount(viewer),
  ]);

  const total = countRows[0]?.total || 0;
  return {
    items: rows.map(toNotification),
    unreadCount,
    pagination: { page: current, pageSize: size, total, totalPages: Math.max(Math.ceil(total / size), 1) },
  };
}

// ---------- Mutating the caller's own state ----------

function parseId(id) {
  if (!/^\d{1,18}$/.test(String(id))) throw new NotificationError("Notification not found.", 404);
  return String(id);
}

// Confirms the notification exists AND is visible to this viewer; anything
// else is a 404 so ids can't be probed across audiences.
async function assertVisible(viewer, id) {
  const rows = await sqlQuery(`SELECT n.id ${SCOPED_FROM} AND n.id = $4::bigint`, [...viewerParams(viewer), id]);
  if (!rows.length) throw new NotificationError("Notification not found.", 404);
}

export async function setNotificationRead(viewer, id, read) {
  const nid = parseId(id);
  await assertVisible(viewer, nid);
  await sqlQuery(
    `INSERT INTO admin_notification_reads (user_id, notification_id, read_at)
     VALUES ($1::uuid, $2::bigint, CASE WHEN $3::boolean THEN now() ELSE NULL END)
     ON CONFLICT (user_id, notification_id) DO UPDATE SET read_at = EXCLUDED.read_at`,
    [viewer.userId, nid, Boolean(read)]
  );
  return { id: nid, read: Boolean(read), unreadCount: await getUnreadCount(viewer) };
}

export async function clearNotification(viewer, id) {
  const nid = parseId(id);
  await assertVisible(viewer, nid);
  await sqlQuery(
    `INSERT INTO admin_notification_reads (user_id, notification_id, read_at, dismissed_at)
     VALUES ($1::uuid, $2::bigint, now(), now())
     ON CONFLICT (user_id, notification_id) DO UPDATE
       SET dismissed_at = now(), read_at = COALESCE(admin_notification_reads.read_at, now())`,
    [viewer.userId, nid]
  );
  return { id: nid, unreadCount: await getUnreadCount(viewer) };
}

export async function markAllNotificationsRead(viewer) {
  await sqlQuery(
    `INSERT INTO admin_notification_reads (user_id, notification_id, read_at)
     SELECT $1::uuid, n.id, now() ${SCOPED_FROM} AND r.read_at IS NULL
     ON CONFLICT (user_id, notification_id) DO UPDATE SET read_at = now()`,
    viewerParams(viewer)
  );
  return { unreadCount: await getUnreadCount(viewer) };
}

export async function clearAllNotifications(viewer) {
  await sqlQuery(
    `INSERT INTO admin_notification_reads (user_id, notification_id, read_at, dismissed_at)
     SELECT $1::uuid, n.id, now(), now() ${SCOPED_FROM}
     ON CONFLICT (user_id, notification_id) DO UPDATE
       SET dismissed_at = now(), read_at = COALESCE(admin_notification_reads.read_at, now())`,
    viewerParams(viewer)
  );
  return { unreadCount: 0 };
}
