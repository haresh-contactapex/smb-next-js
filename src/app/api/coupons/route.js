import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { listCoupons, createCoupon, deleteCoupons } from "@/lib/coupons";
import { readBulkIds } from "@/lib/bulkIds";
import { logAdminActivity } from "@/lib/notifications";

export async function GET() {
  const auth = await requireStaffPermission("coupons.view");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const data = await listCoupons();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = await requireStaffPermission("coupons.create");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const payload = await request.json();
    const id = await createCoupon(payload);
    await logAdminActivity({
      actor: auth.user,
      action: "coupon.created",
      entityType: "coupon",
      entityId: id,
      title: `Coupon "${String(payload?.code || payload?.name || "").slice(0, 80) || "untitled"}" created`,
      severity: "success",
    });
    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Bulk delete: body `{ ids: [couponId, ...] }`.
export async function DELETE(request) {
  const auth = await requireStaffPermission("coupons.delete");
  if (!auth.ok) return permissionDeniedResponse(auth);

  const { ids, error } = await readBulkIds(request, "coupon");
  if (error) return NextResponse.json({ success: false, error }, { status: 400 });

  try {
    const deleted = await deleteCoupons(ids);
    if (deleted > 0) {
      await logAdminActivity({
        actor: auth.user,
        action: "coupon.deleted",
        entityType: "coupon",
        entityId: null,
        title: `${deleted} coupon${deleted === 1 ? "" : "s"} deleted`,
        severity: "warning",
      });
    }
    return NextResponse.json({ success: true, data: { deleted } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
