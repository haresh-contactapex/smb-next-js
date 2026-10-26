import { ok } from "@/lib/api";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { listCmsRevisions } from "@/lib/cms";
import { cmsFailure } from "@/lib/cmsApi";

// The saved earlier versions of a page (newest first, without their bodies). Only
// those who can edit the page can look back at it.
export async function GET(request, { params }) {
  const auth = await requireStaffPermission("content.edit");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    return ok(await listCmsRevisions((await params).id));
  } catch (error) {
    return cmsFailure(error);
  }
}
