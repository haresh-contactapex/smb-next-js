import { NextResponse } from "next/server";
import { requireStaffPermission } from "@/lib/auth/staffPermissions";
import {
  getAdminRoleById,
  updateAdminRole,
  setAdminRoleStatus,
  deleteAdminRole,
  AdminRoleError,
} from "@/lib/adminRoles";
import { MANAGE_ROLES_PERMISSION } from "@/lib/permissions";

function errorResponse(error) {
  if (error instanceof AdminRoleError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }
  return NextResponse.json({ success: false, error: error.message }, { status: 500 });
}

async function authorize() {
  const auth = await requireStaffPermission(MANAGE_ROLES_PERMISSION);
  if (!auth.ok) return { auth, denied: NextResponse.json({ success: false, error: auth.error }, { status: auth.status }) };
  return { auth };
}

export async function GET(request, { params }) {
  const { denied } = await authorize();
  if (denied) return denied;

  try {
    const { id } = await params;
    const data = await getAdminRoleById(id);
    if (!data) return NextResponse.json({ success: false, error: "Role not found." }, { status: 404 });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request, { params }) {
  const { auth, denied } = await authorize();
  if (denied) return denied;

  try {
    const { id } = await params;
    const payload = await request.json();
    const data = await updateAdminRole(id, payload, auth.role);
    return NextResponse.json({ success: true, data });
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
    const payload = await request.json();
    const data = await setAdminRoleStatus(id, String(payload.status || ""), auth.role);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request, { params }) {
  const { denied } = await authorize();
  if (denied) return denied;

  try {
    const { id } = await params;
    const data = await deleteAdminRole(id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return errorResponse(error);
  }
}
