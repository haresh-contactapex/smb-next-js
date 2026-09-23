import { NextResponse } from "next/server";
import { requireStaffPermission } from "@/lib/auth/staffPermissions";
import { duplicateAdminRole, AdminRoleError } from "@/lib/adminRoles";
import { MANAGE_ROLES_PERMISSION } from "@/lib/permissions";

export async function POST(request, { params }) {
  const auth = await requireStaffPermission(MANAGE_ROLES_PERMISSION);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
    const data = await duplicateAdminRole(id, auth.role);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    const status = error instanceof AdminRoleError ? error.status : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
