import { isUuid } from "@/lib/shared/ids";
import { publicErrorMessage } from "@/lib/publicError";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { getCouponById, updateCoupon, deleteCoupon, CouponError } from "@/lib/coupons";
import { fail, failureFrom, ok, readJsonBody } from "@/lib/api";
import { logAdminActivity } from "@/lib/notifications";

const MAX_COUPON_BODY_BYTES = 64 * 1024;

export async function GET(request, { params }) {
  const auth = await requireStaffPermission(["coupons.view", "coupons.edit"]);
  if (!auth.ok) return permissionDeniedResponse(auth);
  if (!isUuid(params.id)) return fail("Not found", 404);

  try {
    const coupon = await getCouponById(params.id);
    if (!coupon) {
      return fail("Not found", 404);
    }
    return ok(coupon);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}

export async function PUT(request, { params }) {
  const auth = await requireStaffPermission("coupons.edit");
  if (!auth.ok) return permissionDeniedResponse(auth);
  if (!isUuid(params.id)) return fail("Not found", 404);

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
    return ok({ id });
  } catch (error) {
    return failureFrom(error, { KnownError: CouponError, fallbackMessage: "Couldn't save the coupon.", label: "Update coupon" });
  }
}

export async function DELETE(request, { params }) {
  const auth = await requireStaffPermission("coupons.delete");
  if (!auth.ok) return permissionDeniedResponse(auth);
  if (!isUuid(params.id)) return fail("Not found", 404);

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
    return ok({ id: params.id });
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
