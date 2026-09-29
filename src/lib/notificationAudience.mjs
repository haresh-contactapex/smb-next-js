// Pure audience rule shared by the Next.js app and the standalone WebSocket
// server (scripts/notifications-ws-server.mjs) — no imports, so plain Node can
// load it too. The SQL used by the list/count queries in notifications.js
// mirrors this exactly; change both together.
//
// viewer: { userId, active, fullAccess, permissions: string[] | Set<string> }
// notification: { audiencePermission, targetUserId }

export function canViewNotification(viewer, notification) {
  if (!viewer?.userId || !notification) return false;
  if (notification.targetUserId && notification.targetUserId === viewer.userId) return true;
  if (!viewer.active) return false;
  if (viewer.fullAccess) return true;
  if (!notification.audiencePermission) return false;
  const permissions = viewer.permissions instanceof Set ? viewer.permissions : new Set(viewer.permissions || []);
  return permissions.has(notification.audiencePermission);
}
