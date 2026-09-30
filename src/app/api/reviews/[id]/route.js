import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { roleHasPermission } from "@/lib/permissions";
import { getReviewById, updateReview, setReviewStatus, deleteReview, parseReviewBody } from "@/lib/reviews";
import { STATUS_LABELS } from "@/lib/reviewFields";
import { logAdminActivity } from "@/lib/notifications";

function errorResponse(error) {
  return NextResponse.json({ success: false, error: error.message }, { status: error.status || 500 });
}

export async function GET(request, { params }) {
  const auth = await requireStaffPermission(["reviews.view", "reviews.edit"]);
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const { id } = await params;
    const review = await getReviewById(id);
    if (!review) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: review });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request, { params }) {
  const auth = await requireStaffPermission("reviews.edit");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const { id } = await params;
    const payload = await parseReviewBody(request);
    await updateReview(id, payload, { canApprove: roleHasPermission(auth.role, "reviews.approve") });
    await logAdminActivity({
      actor: auth.user,
      action: "review.updated",
      entityType: "review",
      entityId: id,
      title: `Review "${String(payload.title || "").trim().slice(0, 80) || "untitled"}" updated`,
    });
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    return errorResponse(error);
  }
}

// Moderation only: flips the status without touching the review's content.
export async function PATCH(request, { params }) {
  const auth = await requireStaffPermission("reviews.approve");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const { id } = await params;
    const { status } = await parseReviewBody(request);
    await setReviewStatus(id, status);
    await logAdminActivity({
      actor: auth.user,
      action: "review.status_changed",
      entityType: "review",
      entityId: id,
      title: `Review marked ${STATUS_LABELS[status].toLowerCase()}`,
      severity: status === "REJECTED" ? "warning" : "info",
    });
    return NextResponse.json({ success: true, data: { id, status } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request, { params }) {
  const auth = await requireStaffPermission("reviews.delete");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const { id } = await params;
    await deleteReview(id);
    await logAdminActivity({
      actor: auth.user,
      action: "review.deleted",
      entityType: "review",
      entityId: id,
      title: "Review deleted",
      severity: "warning",
    });
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    return errorResponse(error);
  }
}
