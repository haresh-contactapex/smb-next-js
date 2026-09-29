import { NextResponse } from "next/server";
import { requireStaffPermission } from "@/lib/auth/staffPermissions";
import { getStaffUserById, updateStaffUser, deleteStaffUser, StaffUserError } from "@/lib/staffUsers";
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

export async function GET(request, { params }) {
  const auth = await requireStaffPermission("users.view");
  if (!auth.ok) return denied(auth);

  try {
    const { id } = await params;
    const data = await getStaffUserById(id);
    if (!data) return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request, { params }) {
  const auth = await requireStaffPermission("users.edit");
  if (!auth.ok) return denied(auth);

  try {
    const { id } = await params;
    const payload = await request.json().catch(() => null);
    if (!payload) return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
    const data = await updateStaffUser(id, payload, auth.user, auth.role);
    await logAdminActivity({
      actor: auth.user,
      action: "user.updated",
      entityType: "user",
      entityId: id,
      title: `Admin user ${data?.firstName || ""} ${data?.lastName || ""}`.trim() + " updated",
      description: "Profile or access details were changed.",
      metadata: { fields: Object.keys(payload).filter((key) => !/pass/i.test(key)) },
    });
    if (payload.role !== undefined) {
      await logAdminActivity({
        actor: auth.user,
        action: "role.assigned",
        entityType: "role",
        entityId: id,
        title: `Role set to ${payload.role} for ${data?.firstName || "an admin"} ${data?.lastName || ""}`.trim(),
        severity: "warning",
        metadata: { userId: id, role: String(payload.role) },
      });
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request, { params }) {
  const auth = await requireStaffPermission("users.delete");
  if (!auth.ok) return denied(auth);

  try {
    const { id } = await params;
    const data = await deleteStaffUser(id, auth.user, auth.role);
    await logAdminActivity({
      actor: auth.user,
      action: "user.deleted",
      entityType: "user",
      entityId: id,
      title: "Admin user deleted",
      severity: "warning",
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return errorResponse(error);
  }
}
