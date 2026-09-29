import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { getProductById, updateProduct, deleteProduct } from "@/lib/products";
import { logAdminActivity } from "@/lib/notifications";

export async function GET(request, { params }) {
  const auth = await requireStaffPermission(["products.view", "products.edit"]);
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const product = await getProductById(params.id);
    if (!product) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const auth = await requireStaffPermission("products.edit");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const payload = await request.json();
    const id = await updateProduct(params.id, payload);
    await logAdminActivity({
      actor: auth.user,
      action: "product.updated",
      entityType: "product",
      entityId: id,
      title: `Product "${String(payload?.name || payload?.title || params.id).slice(0, 80)}" updated`,
    });
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status || 500 });
  }
}

export async function DELETE(request, { params }) {
  const auth = await requireStaffPermission("products.delete");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    await deleteProduct(params.id);
    await logAdminActivity({
      actor: auth.user,
      action: "product.deleted",
      entityType: "product",
      entityId: params.id,
      title: "Product deleted",
      severity: "warning",
    });
    return NextResponse.json({ success: true, data: { id: params.id } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
