import { NextResponse } from "next/server";
import { publicErrorMessage } from "@/lib/publicError";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { getCouponById, updateCoupon, deleteCoupon, CouponError } from "@/lib/coupons";
import { failureFrom, readJsonBody } from "@/lib/api";
import { logAdminActivity } from "@/lib/notifications";

const MAX_COUPON_BODY_BYTES = 64 * 1024;

export async function GET(request, { params }) {
  const auth = await requireStaffPermission(["coupons.view", "coupons.edit"]);
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const coupon = await getCouponById(params.id);
    if (!coupon) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: coupon });
  } catch (error) {
    return NextResponse.json({ success: false, error: publicErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const auth = await requireStaffPermission("coupons.edit");
  if (!auth.ok) return permissionDeniedResponse(auth);

  const body = await readJsonBody(request, { maxBytes: MAX_COUPON_BODY_BYTES });
  if (body.response) return body.response;
  const payload = body.payload;

  try {
    const id = await updateCoupon(params.id, payload);
    await logAdminActivity({
      actor: auth.user,
      action: "coupon.updated",
      entityType: "coupon",
      entityId: id,
      title: `Coupon "${String(payload?.code || payload?.name || "").slice(0, 80) || "untitled"}" updated`,
    });
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    return failureFrom(error, { KnownError: CouponError, fallbackMessage: "Couldn't save the coupon.", label: "Update coupon" });
  }
}

export async function DELETE(request, { params }) {
  const auth = await requireStaffPermission("coupons.delete");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    await deleteCoupon(params.id);
    await logAdminActivity({
      actor: auth.user,
      action: "coupon.deleted",
      entityType: "coupon",
      entityId: params.id,
      title: "Coupon deleted",
      severity: "warning",
    });
    return NextResponse.json({ success: true, data: { id: params.id } });
  } catch (error) {
    return NextResponse.json({ success: false, error: publicErrorMessage(error) }, { status: 500 });
  }
}
