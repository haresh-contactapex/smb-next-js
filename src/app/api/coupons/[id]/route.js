import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { getCouponById, updateCoupon, deleteCoupon } from "@/lib/coupons";

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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const auth = await requireStaffPermission("coupons.edit");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const payload = await request.json();
    const id = await updateCoupon(params.id, payload);
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const auth = await requireStaffPermission("coupons.delete");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    await deleteCoupon(params.id);
    return NextResponse.json({ success: true, data: { id: params.id } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
