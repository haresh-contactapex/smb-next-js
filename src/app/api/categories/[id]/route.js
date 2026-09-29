import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { getCategoryById, updateCategory, deleteCategory } from "@/lib/categories";
import { logAdminActivity } from "@/lib/notifications";

export async function GET(request, { params }) {
  const auth = await requireStaffPermission(["categories.view", "categories.edit"]);
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const category = await getCategoryById(params.id);
    if (!category) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const auth = await requireStaffPermission("categories.edit");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const payload = await request.json();
    const id = await updateCategory(params.id, payload);
    await logAdminActivity({
      actor: auth.user,
      action: "category.updated",
      entityType: "category",
      entityId: id,
      title: `Category "${String(payload?.name || payload?.title || "").slice(0, 80) || "untitled"}" updated`,
    });
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const auth = await requireStaffPermission("categories.delete");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    await deleteCategory(params.id);
    await logAdminActivity({
      actor: auth.user,
      action: "category.deleted",
      entityType: "category",
      entityId: params.id,
      title: "Category deleted",
      severity: "warning",
    });
    return NextResponse.json({ success: true, data: { id: params.id } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
