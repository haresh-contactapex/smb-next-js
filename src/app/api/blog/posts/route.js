import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { roleHasPermission } from "@/lib/permissions";
import { logAdminActivity } from "@/lib/notifications";
import { createBlogPost, deleteBlogPosts, getBlogPostById, listBlogPosts } from "@/lib/blog";
import { readBulkIds } from "@/lib/bulkIds";
import { blogFailure, invalidRequest, readJsonObject } from "@/lib/blogApi";
import { blogPostPath } from "@/lib/blogRules";

// Blog -> All Posts. GET lists every post (without its body); POST adds one.
// Both check the staff member's role here: middleware does not cover /api.

export async function GET() {
  const auth = await requireStaffPermission("blog.view");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    return NextResponse.json({ success: true, data: await listBlogPosts() });
  } catch (error) {
    return blogFailure(error);
  }
}

export async function POST(request) {
  const auth = await requireStaffPermission("blog.create");
  if (!auth.ok) return permissionDeniedResponse(auth);

  const body = await readJsonObject(request);
  if (!body) return invalidRequest();

  try {
    const id = await createBlogPost(body, auth.user, { canPublish: roleHasPermission(auth.role, "blog.publish") });
    const post = await getBlogPostById(id);
    await logAdminActivity({
      actor: auth.user,
      action: "blog.created",
      entityType: "blog",
      entityId: id,
      title: `Blog post "${post.title.slice(0, 80)}" created`,
      description: `added ${blogPostPath(post.categorySlug, post.slug)} (${post.status}).`,
      severity: "success",
    });
    return NextResponse.json({ success: true, data: post }, { status: 201 });
  } catch (error) {
    return blogFailure(error);
  }
}

// Bulk delete: body `{ ids: [postId, ...] }`.
export async function DELETE(request) {
  const auth = await requireStaffPermission("blog.delete");
  if (!auth.ok) return permissionDeniedResponse(auth);

  const { ids, error } = await readBulkIds(request, "post");
  if (error) return NextResponse.json({ success: false, error }, { status: 400 });

  try {
    const removed = await deleteBlogPosts(ids);
    if (removed.length > 0) {
      await logAdminActivity({
        actor: auth.user,
        action: "blog.deleted",
        entityType: "blog",
        entityId: null,
        title: `${removed.length} blog post${removed.length === 1 ? "" : "s"} deleted`,
        description: `removed ${removed.map((post) => blogPostPath(post.categorySlug, post.slug)).join(", ")}.`.slice(0, 500),
        severity: "warning",
      });
    }
    return NextResponse.json({ success: true, data: { deleted: removed.length } });
  } catch (error) {
    return blogFailure(error);
  }
}
