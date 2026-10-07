import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { roleHasPermission } from "@/lib/permissions";
import { logAdminActivity } from "@/lib/notifications";
import { deleteBlogPost, getBlogPostById, updateBlogPost } from "@/lib/blog";
import { blogFailure, invalidRequest, readJsonObject } from "@/lib/blogApi";
import { blogPostPath } from "@/lib/blogRules";

// One blog post. GET returns it with its body, PUT saves it and DELETE removes it.
// PUT takes the post fields plus `expectedUpdatedAt` (the updatedAt the editor
// loaded), and answers 409 when someone else saved the post in the meantime.

const notFound = () => NextResponse.json({ success: false, error: "That post no longer exists." }, { status: 404 });

export async function GET(request, { params }) {
  const auth = await requireStaffPermission(["blog.view", "blog.edit"]);
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const { id } = await params;
    const post = await getBlogPostById(id);
    return post ? NextResponse.json({ success: true, data: post }) : notFound();
  } catch (error) {
    return blogFailure(error);
  }
}

export async function PUT(request, { params }) {
  const auth = await requireStaffPermission("blog.edit");
  if (!auth.ok) return permissionDeniedResponse(auth);

  const body = await readJsonObject(request);
  if (!body) return invalidRequest();

  try {
    const { id } = await params;
    await updateBlogPost(id, body, auth.user, {
      expectedUpdatedAt: body.expectedUpdatedAt,
      canPublish: roleHasPermission(auth.role, "blog.publish"),
    });
    const post = await getBlogPostById(id);
    await logAdminActivity({
      actor: auth.user,
      action: "blog.updated",
      entityType: "blog",
      entityId: post.id,
      title: `Blog post "${post.title.slice(0, 80)}" updated`,
      description: `edited ${blogPostPath(post.categorySlug, post.slug)} (${post.status}).`,
    });
    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    return blogFailure(error);
  }
}

export async function DELETE(request, { params }) {
  const auth = await requireStaffPermission("blog.delete");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const { id } = await params;
    const removed = await deleteBlogPost(id);
    await logAdminActivity({
      actor: auth.user,
      action: "blog.deleted",
      entityType: "blog",
      entityId: removed.id,
      title: `Blog post "${removed.title.slice(0, 80)}" deleted`,
      description: `removed ${blogPostPath(removed.categorySlug, removed.slug)}.`,
      severity: "warning",
    });
    return NextResponse.json({ success: true, data: { id: removed.id } });
  } catch (error) {
    return blogFailure(error);
  }
}
