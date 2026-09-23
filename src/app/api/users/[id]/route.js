import { NextResponse } from "next/server";
import { requireStaffPermission } from "@/lib/auth/staffPermissions";
import { getStaffUserById, updateStaffUser, deleteStaffUser, StaffUserError } from "@/lib/staffUsers";

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
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return errorResponse(error);
  }
}
