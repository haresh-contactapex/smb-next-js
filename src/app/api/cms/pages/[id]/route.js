import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { roleHasPermission } from "@/lib/permissions";
import { logAdminActivity } from "@/lib/notifications";
import { deleteCmsPage, getCmsPageById, updateCmsPage } from "@/lib/cms";
import { cmsFailure, invalidRequest, readJsonObject } from "@/lib/cmsApi";

// One CMS page. GET returns it with its body, PUT saves it and DELETE removes it.
// PUT takes the page fields plus `expectedUpdatedAt` (the updatedAt the editor
// loaded), and answers 409 when someone else saved the page in the meantime.

const notFound = () => NextResponse.json({ success: false, error: "That page no longer exists." }, { status: 404 });

export async function GET(request, { params }) {
  const auth = await requireStaffPermission(["content.view", "content.edit"]);
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const { id } = await params;
    const page = await getCmsPageById(id);
    return page ? NextResponse.json({ success: true, data: page }) : notFound();
  } catch (error) {
    return cmsFailure(error);
  }
}

export async function PUT(request, { params }) {
  const auth = await requireStaffPermission("content.edit");
  if (!auth.ok) return permissionDeniedResponse(auth);

  const body = await readJsonObject(request);
  if (!body) return invalidRequest();

  try {
    const { id } = await params;
    await updateCmsPage(id, body, auth.user, {
      expectedUpdatedAt: body.expectedUpdatedAt,
      canPublish: roleHasPermission(auth.role, "content.publish"),
    });
    const page = await getCmsPageById(id);
    await logAdminActivity({
      actor: auth.user,
      action: "content.updated",
      entityType: "content",
      entityId: page.id,
      title: `CMS page "${page.title.slice(0, 80)}" updated`,
      description: `edited /${page.slug} (${page.status}).`,
    });
    return NextResponse.json({ success: true, data: page });
  } catch (error) {
    return cmsFailure(error);
  }
}

export async function DELETE(request, { params }) {
  const auth = await requireStaffPermission("content.delete");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const { id } = await params;
    const removed = await deleteCmsPage(id);
    await logAdminActivity({
      actor: auth.user,
      action: "content.deleted",
      entityType: "content",
      entityId: removed.id,
      title: `CMS page "${removed.title.slice(0, 80)}" deleted`,
      description: `removed /${removed.slug}.`,
      severity: "warning",
    });
    return NextResponse.json({ success: true, data: { id: removed.id } });
  } catch (error) {
    return cmsFailure(error);
  }
}
