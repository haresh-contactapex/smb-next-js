import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { searchReviewProducts } from "@/lib/reviews";

// Product suggestions for the review form and the Import Reviews page. Gated by the review permissions
// rather than products.view, so a moderator who can't open the catalog can
// still pick the product a review belongs to.
export async function GET(request) {
  const auth = await requireStaffPermission(["reviews.create", "reviews.edit", "reviews.import"]);
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const q = new URL(request.url).searchParams.get("q") ?? "";
    const data = await searchReviewProducts(q);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
