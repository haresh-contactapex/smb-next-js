import { fail, ok } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { roleHasPermission } from "@/lib/permissions";
import { listReviews, createReview, parseReviewBody, deleteReviews } from "@/lib/reviews";
import { readBulkIds } from "@/lib/bulkIds";
import { logAdminActivity } from "@/lib/notifications";

function errorResponse(error) {
  return fail(publicErrorMessage(error), error.status || 500);
}

export async function GET() {
  const auth = await requireStaffPermission("reviews.view");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const data = await listReviews();
    return ok(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request) {
  const auth = await requireStaffPermission("reviews.create");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const payload = await parseReviewBody(request);
    const id = await createReview(payload, { canApprove: roleHasPermission(auth.role, "reviews.approve") });
    await logAdminActivity({
      actor: auth.user,
      action: "review.created",
      entityType: "review",
      entityId: id,
      title: `Review "${String(payload.title || "").trim().slice(0, 80) || "untitled"}" added`,
      severity: "success",
    });
    return ok({ id }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

// Bulk delete: body `{ ids: [reviewId, ...] }`.
export async function DELETE(request) {
  const auth = await requireStaffPermission("reviews.delete");
  if (!auth.ok) return permissionDeniedResponse(auth);

  const { ids, error } = await readBulkIds(request, "review");
  if (error) return fail(error, 400);

  try {
    const deleted = await deleteReviews(ids);
    if (deleted > 0) {
      await logAdminActivity({
        actor: auth.user,
        action: "review.deleted",
        entityType: "review",
        entityId: null,
        title: `${deleted} review${deleted === 1 ? "" : "s"} deleted`,
        severity: "warning",
      });
    }
    return ok({ deleted });
  } catch (error) {
    return errorResponse(error);
  }
}
