import { fail, ok } from "@/lib/api";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { getBlogRevision } from "@/lib/blog";
import { blogFailure } from "@/lib/blogApi";

// One earlier version of a post, with its body. The editor loads it into the form
// (nothing is saved until the staff member saves), so a restore goes through the
// normal PUT with its permission and conflict checks.
export async function GET(request, { params }) {
  const auth = await requireStaffPermission("blog.edit");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const { id, revisionId } = await params;
    const revision = await getBlogRevision(id, revisionId);
    if (!revision) {
      return fail("That version no longer exists.", 404);
    }
    return ok(revision);
  } catch (error) {
    return blogFailure(error);
  }
}
