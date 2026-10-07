import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { getCmsRevision } from "@/lib/cms";
import { cmsFailure } from "@/lib/cmsApi";

// One earlier version of a page, with its body. The editor loads it into the form
// (nothing is saved until the staff member saves), so a restore goes through the
// normal PUT with its permission and conflict checks.
export async function GET(request, { params }) {
  const auth = await requireStaffPermission("content.edit");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const { id, revisionId } = await params;
    const revision = await getCmsRevision(id, revisionId);
    if (!revision) {
      return NextResponse.json({ success: false, error: "That version no longer exists." }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: revision });
  } catch (error) {
    return cmsFailure(error);
  }
}
