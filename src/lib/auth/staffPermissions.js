import { NextResponse } from "next/server";
import { getCurrentStaffUser } from "./staffSession";
import { getAdminRoleBySlug, AdminRoleError } from "../adminRoles";
import { roleHasPermission } from "../permissions";

/**
 * Server-side permission gate for staff API routes and server pages.
 * Resolves the signed-in staff user's role (users.role -> admin_roles.slug)
 * and checks a "module.action" permission key against it. An inactive or
 * missing role grants nothing.
 *
 * `permission` is one key, or an array meaning "any of these" — for shared
 * lookups such as the category list, which product forms also need.
 *
 * Returns { ok: true, user, role } or { ok: false, status, error }.
 */
export async function requireStaffPermission(permission) {
  const user = await getCurrentStaffUser();
  if (!user) return { ok: false, status: 401, error: "Not signed in." };

  let role;
  try {
    role = await getAdminRoleBySlug(user.role);
  } catch (error) {
    if (error instanceof AdminRoleError) return { ok: false, status: error.status, error: error.message };
    console.error("requireStaffPermission: failed to load role", error);
    return { ok: false, status: 500, error: "Couldn't verify your permissions. Try again." };
  }

  const keys = Array.isArray(permission) ? permission : [permission];
  if (!keys.some((key) => roleHasPermission(role, key))) {
    return { ok: false, status: 403, error: "You don't have permission to do that." };
  }
  return { ok: true, user, role };
}

// The standard JSON envelope for a failed requireStaffPermission() result.
export function permissionDeniedResponse(auth) {
  return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
}
