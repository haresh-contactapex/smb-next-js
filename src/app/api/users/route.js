import { fail, ok } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { requireStaffPermission } from "@/lib/auth/staffPermissions";
import { listStaffUsers, createStaffUser, deleteStaffUsers, StaffUserError } from "@/lib/staffUsers";

const MAX_BULK_DELETE = 500;
import { logAdminActivity } from "@/lib/notifications";
import { getTrustedOrigin } from "@/lib/siteUrl";

function errorResponse(error) {
  if (error instanceof StaffUserError) {
    return fail(publicErrorMessage(error), error.status, { field: error.field });
  }
  console.error("Users API error", error);
  return fail("Something went wrong. Try again.", 500);
}

function denied(auth) {
  return fail(auth.error, auth.status);
}

export async function GET() {
  const auth = await requireStaffPermission("users.view");
  if (!auth.ok) return denied(auth);

  try {
    const data = await listStaffUsers();
    return ok(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request) {
  const auth = await requireStaffPermission("users.create");
  if (!auth.ok) return denied(auth);

  try {
    const payload = await request.json().catch(() => null);
    if (!payload) return fail("Invalid request body.", 400);
    const { user, welcomeEmailSent } = await createStaffUser(payload, auth.role, { origin: getTrustedOrigin(request) });
    await logAdminActivity({
      actor: auth.user,
      action: "user.created",
      entityType: "user",
      entityId: user.id,
      title: `Admin user ${user.firstName} ${user.lastName} created`,
      description: `Assigned role: ${user.role}.`,
      severity: "success",
      metadata: { role: user.role },
    });
    return ok({ ...user, welcomeEmailSent }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

// Bulk delete: body `{ ids: [userId, ...] }`.
export async function DELETE(request) {
  const auth = await requireStaffPermission("users.delete");
  if (!auth.ok) return denied(auth);

  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids) ? body.ids : null;
  if (!ids || ids.length === 0) {
    return fail("Select at least one user to delete.", 400);
  }
  if (ids.length > MAX_BULK_DELETE || ids.some((id) => typeof id !== "string")) {
    return fail("Invalid user selection.", 400);
  }

  try {
    const data = await deleteStaffUsers(ids, auth.user, auth.role);
    if (data.deleted > 0) {
      await logAdminActivity({
        actor: auth.user,
        action: "user.deleted",
        entityType: "user",
        entityId: null,
        title: `${data.deleted} admin user${data.deleted === 1 ? "" : "s"} deleted`,
        description: data.users.map((u) => `${u.firstName} ${u.lastName}`.trim()).join(", "),
        severity: "warning",
      });
    }
    return ok(data);
  } catch (error) {
    return errorResponse(error);
  }
}
