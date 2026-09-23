// Client-side calls and guards for per-user actions shared by the list and
// edit screens. The API enforces the same rules; these only explain them.
import { fullName } from "./helpers";

export async function deleteUser(user) {
  const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to delete user");
  return json.data;
}

export function confirmDelete(user) {
  return window.confirm(
    `Delete ${fullName(user)} (${user.email})? They'll lose access to the admin panel immediately. This can't be undone.`
  );
}

// `context` is { currentUserId, actorFullAccess }. Each returns why the
// signed-in user can't do it, or null when they can.
export function editBlockedReason(user, { currentUserId, actorFullAccess }) {
  if (user.roleFullAccess && !actorFullAccess && user.id !== currentUserId) {
    return "Only a Super Admin can change another Super Admin";
  }
  return null;
}

export function deleteBlockedReason(user, context) {
  if (user.id === context.currentUserId) return "You can't delete your own account";
  return editBlockedReason(user, context);
}
