import { fail, ok, readJsonBody } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { requireStaffPermission } from "@/lib/auth/staffPermissions";
import {
  getAdminRoleById,
  updateAdminRole,
  setAdminRoleStatus,
  deleteAdminRole,
  AdminRoleError,
} from "@/lib/adminRoles";
import { MANAGE_ROLES_PERMISSION } from "@/lib/permissions";
import { logAdminActivity } from "@/lib/notifications";

function errorResponse(error) {
  if (error instanceof AdminRoleError) {
    return fail(publicErrorMessage(error), error.status);
  }
  return fail(publicErrorMessage(error), 500);
}

async function authorize() {
  const auth = await requireStaffPermission(MANAGE_ROLES_PERMISSION);
  if (!auth.ok) return { auth, denied: fail(auth.error, auth.status) };
  return { auth };
}

export async function GET(request, { params }) {
  const { denied } = await authorize();
  if (denied) return denied;

  try {
    const { id } = await params;
    const data = await getAdminRoleById(id);
    if (!data) return fail("Role not found.", 404);
    return ok(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request, { params }) {
  const { auth, denied } = await authorize();
  if (denied) return denied;

  try {
    const { id } = await params;
    const body = await readJsonBody(request);
    if (body.response) return body.response;
    const payload = body.payload;
    const data = await updateAdminRole(id, payload, auth.role);
    await logAdminActivity({
      actor: auth.user,
      action: "role.permissions_changed",
      entityType: "role",
      entityId: id,
      title: `Role "${data?.name}" permissions updated`,
      severity: "warning",
      metadata: { permissionCount: data?.permissions?.length ?? 0, fullAccess: Boolean(data?.fullAccess) },
    });
    return ok(data);
  } catch (error) {
    return errorResponse(error);
  }
}

// Activate / deactivate: { status: "active" | "inactive" }
export async function PATCH(request, { params }) {
  const { auth, denied } = await authorize();
  if (denied) return denied;

  try {
    const { id } = await params;
    const body = await readJsonBody(request);
    if (body.response) return body.response;
    const payload = body.payload;
    const data = await setAdminRoleStatus(id, String(payload.status || ""), auth.role);
    await logAdminActivity({
      actor: auth.user,
      action: "role.status_changed",
      entityType: "role",
      entityId: id,
      title: `Role "${data?.name}" ${data?.status === "active" ? "activated" : "deactivated"}`,
      severity: "warning",
      metadata: { status: data?.status },
    });
    return ok(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request, { params }) {
  const { auth, denied } = await authorize();
  if (denied) return denied;

  try {
    const { id } = await params;
    const data = await deleteAdminRole(id, auth.role);
    await logAdminActivity({
      actor: auth.user,
      action: "role.deleted",
      entityType: "role",
      entityId: id,
      title: "Role deleted",
      severity: "warning",
    });
    return ok(data);
  } catch (error) {
    return errorResponse(error);
  }
}
