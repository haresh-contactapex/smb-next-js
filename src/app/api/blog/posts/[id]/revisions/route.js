import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { listBlogRevisions } from "@/lib/blog";
import { blogFailure } from "@/lib/blogApi";

// The saved earlier versions of a post (newest first, without their bodies). Only
// those who can edit the post can look back at it.
export async function GET(request, { params }) {
  const auth = await requireStaffPermission("blog.edit");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    return NextResponse.json({ success: true, data: await listBlogRevisions((await params).id) });
  } catch (error) {
    return blogFailure(error);
  }
}
