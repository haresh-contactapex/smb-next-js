import { fail, ok } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { requireStaffPermission } from "@/lib/auth/staffPermissions";
import { duplicateAdminRole, AdminRoleError } from "@/lib/adminRoles";
import { MANAGE_ROLES_PERMISSION } from "@/lib/permissions";
import { logAdminActivity } from "@/lib/notifications";

export async function POST(request, { params }) {
  const auth = await requireStaffPermission(MANAGE_ROLES_PERMISSION);
  if (!auth.ok) return fail(auth.error, auth.status);

  try {
    const { id } = await params;
    const data = await duplicateAdminRole(id, auth.role);
    await logAdminActivity({
      actor: auth.user,
      action: "role.created",
      entityType: "role",
      entityId: data?.id,
      title: `Role "${data?.name}" created (duplicate)`,
      severity: "warning",
    });
    return ok(data, 201);
  } catch (error) {
    const status = error instanceof AdminRoleError ? error.status : 500;
    return fail(publicErrorMessage(error), status);
  }
}
