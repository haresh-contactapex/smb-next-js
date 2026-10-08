import { NextResponse } from "next/server";
import { requireStaffPermission } from "@/lib/auth/staffPermissions";
import { listStaffUsers, createStaffUser, deleteStaffUsers, StaffUserError } from "@/lib/staffUsers";

const MAX_BULK_DELETE = 500;
import { logAdminActivity } from "@/lib/notifications";

function errorResponse(error) {
  if (error instanceof StaffUserError) {
    return NextResponse.json({ success: false, error: error.message, field: error.field }, { status: error.status });
  }
  console.error("Users API error", error);
  return NextResponse.json({ success: false, error: "Something went wrong. Try again." }, { status: 500 });
}

function denied(auth) {
  return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
}

export async function GET() {
  const auth = await requireStaffPermission("users.view");
  if (!auth.ok) return denied(auth);

  try {
    const data = await listStaffUsers();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request) {
  const auth = await requireStaffPermission("users.create");
  if (!auth.ok) return denied(auth);

  try {
    const payload = await request.json().catch(() => null);
    if (!payload) return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
    const { user, welcomeEmailSent } = await createStaffUser(payload, auth.role, { origin: new URL(request.url).origin });
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
    return NextResponse.json({ success: true, data: { ...user, welcomeEmailSent } }, { status: 201 });
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
    return NextResponse.json({ success: false, error: "Select at least one user to delete." }, { status: 400 });
  }
  if (ids.length > MAX_BULK_DELETE || ids.some((id) => typeof id !== "string")) {
    return NextResponse.json({ success: false, error: "Invalid user selection." }, { status: 400 });
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
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return errorResponse(error);
  }
}
