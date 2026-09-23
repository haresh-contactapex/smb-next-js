import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { listCategories, createCategory } from "@/lib/categories";

export async function GET() {
  const auth = await requireStaffPermission(["categories.view", "products.view", "products.create", "products.edit", "coupons.create", "coupons.edit"]);
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const data = await listCategories();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = await requireStaffPermission("categories.create");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const payload = await request.json();
    const id = await createCategory(payload);
    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
