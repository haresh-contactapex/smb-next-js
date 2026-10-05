import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { listProducts, createProduct, searchProducts, deleteProducts } from "@/lib/products";
import { logAdminActivity } from "@/lib/notifications";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BULK_DELETE = 5000;

export async function GET(request) {
  const auth = await requireStaffPermission("products.view");
  if (!auth.ok) return permissionDeniedResponse(auth);

  const q = new URL(request.url).searchParams.get("q")?.trim();

  try {
    const data = q ? await searchProducts(q) : await listProducts();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = await requireStaffPermission("products.create");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const payload = await request.json();
    const id = await createProduct(payload);
    await logAdminActivity({
      actor: auth.user,
      action: "product.created",
      entityType: "product",
      entityId: id,
      title: `Product "${String(payload?.name || payload?.title || "Untitled").slice(0, 80)}" created`,
      severity: "success",
    });
    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status || 500 });
  }
}

// Bulk delete: body `{ ids: [productId, ...] }`.
export async function DELETE(request) {
  const auth = await requireStaffPermission("products.delete");
  if (!auth.ok) return permissionDeniedResponse(auth);

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const ids = Array.isArray(body?.ids) ? [...new Set(body.ids)] : null;
  if (!ids || ids.length === 0) {
    return NextResponse.json({ success: false, error: "Select at least one product to delete" }, { status: 400 });
  }
  if (ids.length > MAX_BULK_DELETE || ids.some((id) => typeof id !== "string" || !UUID_PATTERN.test(id))) {
    return NextResponse.json({ success: false, error: "Invalid product selection" }, { status: 400 });
  }

  try {
    const deleted = await deleteProducts(ids);
    await logAdminActivity({
      actor: auth.user,
      action: "product.deleted",
      entityType: "product",
      entityId: null,
      title: `${deleted} product${deleted === 1 ? "" : "s"} deleted`,
      severity: "warning",
    });
    return NextResponse.json({ success: true, data: { deleted } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
