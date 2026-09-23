import { NextResponse } from "next/server";
import { requireStaffPermission } from "@/lib/auth/staffPermissions";
import { listStaffUsers, createStaffUser, StaffUserError } from "@/lib/staffUsers";

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
    const data = await createStaffUser(payload, auth.role);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
