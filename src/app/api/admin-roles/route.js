import { fail, ok, readJsonBody } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { requireStaffPermission } from "@/lib/auth/staffPermissions";
import { listAdminRoles, createAdminRole, AdminRoleError } from "@/lib/adminRoles";
import { MANAGE_ROLES_PERMISSION } from "@/lib/permissions";
import { logAdminActivity } from "@/lib/notifications";

function errorResponse(error) {
  if (error instanceof AdminRoleError) {
    return fail(publicErrorMessage(error), error.status);
  }
  return fail(publicErrorMessage(error), 500);
}

export async function GET() {
  const auth = await requireStaffPermission(MANAGE_ROLES_PERMISSION);
  if (!auth.ok) return fail(auth.error, auth.status);

  try {
    const data = await listAdminRoles();
    return ok(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request) {
  const auth = await requireStaffPermission(MANAGE_ROLES_PERMISSION);
  if (!auth.ok) return fail(auth.error, auth.status);

  try {
    const body = await readJsonBody(request);
    if (body.response) return body.response;
    const payload = body.payload;
    const data = await createAdminRole(payload, auth.role);
    await logAdminActivity({
      actor: auth.user,
      action: "role.created",
      entityType: "role",
      entityId: data?.id,
      title: `Role "${data?.name}" created`,
      severity: "warning",
      metadata: { permissionCount: data?.permissions?.length ?? 0, fullAccess: Boolean(data?.fullAccess) },
    });
    return ok(data, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
