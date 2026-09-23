// Client-side calls for the per-role actions shared by the list and View
// screens. Each resolves with the API's `data` or throws a readable Error.

async function request(url, options, fallbackError) {
  const res = await fetch(url, options);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.error || fallbackError);
  return json.data;
}

export function duplicateRole(role) {
  return request(`/api/admin-roles/${role.id}/duplicate`, { method: "POST" }, "Failed to duplicate role");
}

export function deleteRole(role) {
  return request(`/api/admin-roles/${role.id}`, { method: "DELETE" }, "Failed to delete role");
}

export function setRoleStatus(role, status) {
  return request(
    `/api/admin-roles/${role.id}`,
    { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) },
    "Failed to update role status"
  );
}

export function confirmDelete(role) {
  return window.confirm(`Delete the "${role.name}" role? This can't be undone.`);
}

export function confirmStatusChange(role, nextStatus) {
  if (nextStatus === "active") return true;
  const users = role.usersAssigned
    ? ` Its ${role.usersAssigned} assigned user${role.usersAssigned === 1 ? "" : "s"} will lose these permissions until it's reactivated.`
    : "";
  return window.confirm(`Deactivate the "${role.name}" role?${users}`);
}

// Why a role can't be deleted, or null when it can.
export function deleteBlockedReason(role) {
  if (role.isSystem) return `${role.name} is a system role and can't be deleted`;
  if (role.usersAssigned > 0) {
    return `Reassign its ${role.usersAssigned} user${role.usersAssigned === 1 ? "" : "s"} before deleting`;
  }
  return null;
}
