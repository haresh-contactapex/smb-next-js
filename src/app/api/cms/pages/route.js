import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { roleHasPermission } from "@/lib/permissions";
import { logAdminActivity } from "@/lib/notifications";
import { createCmsPage, deleteCmsPages, getCmsPageById, listCmsPages } from "@/lib/cms";
import { readBulkIds } from "@/lib/bulkIds";
import { cmsFailure, invalidRequest, readJsonObject } from "@/lib/cmsApi";

// CMS -> All Pages. GET lists every page (without its body); POST adds one.
// Both check the staff member's role here: middleware does not cover /api.

export async function GET() {
  const auth = await requireStaffPermission("content.view");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    return NextResponse.json({ success: true, data: await listCmsPages() });
  } catch (error) {
    return cmsFailure(error);
  }
}

export async function POST(request) {
  const auth = await requireStaffPermission("content.create");
  if (!auth.ok) return permissionDeniedResponse(auth);

  const body = await readJsonObject(request);
  if (!body) return invalidRequest();

  try {
    const id = await createCmsPage(body, auth.user, { canPublish: roleHasPermission(auth.role, "content.publish") });
    const page = await getCmsPageById(id);
    await logAdminActivity({
      actor: auth.user,
      action: "content.created",
      entityType: "content",
      entityId: id,
      title: `CMS page "${page.title.slice(0, 80)}" created`,
      description: `added /${page.slug} (${page.status}).`,
      severity: "success",
    });
    return NextResponse.json({ success: true, data: page }, { status: 201 });
  } catch (error) {
    return cmsFailure(error);
  }
}

// Bulk delete: body `{ ids: [pageId, ...] }`.
export async function DELETE(request) {
  const auth = await requireStaffPermission("content.delete");
  if (!auth.ok) return permissionDeniedResponse(auth);

  const { ids, error } = await readBulkIds(request, "page");
  if (error) return NextResponse.json({ success: false, error }, { status: 400 });

  try {
    const removed = await deleteCmsPages(ids);
    if (removed.length > 0) {
      await logAdminActivity({
        actor: auth.user,
        action: "content.deleted",
        entityType: "content",
        entityId: null,
        title: `${removed.length} CMS page${removed.length === 1 ? "" : "s"} deleted`,
        description: `removed ${removed.map((page) => `/${page.slug}`).join(", ")}.`.slice(0, 500),
        severity: "warning",
      });
    }
    return NextResponse.json({ success: true, data: { deleted: removed.length } });
  } catch (error) {
    return cmsFailure(error);
  }
}
