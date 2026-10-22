import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { logAdminActivity } from "@/lib/notifications";
import { FooterTextError, listFooterTexts, saveFooterTexts } from "@/lib/footerTexts";
import { invalidRequest, readJsonObject } from "@/lib/cmsApi";

// CMS -> Footer Text. GET returns the entries; PUT replaces them all.
// Both check the staff member's role here: middleware does not cover /api.

function failure(error) {
  if (error instanceof FooterTextError) {
    return NextResponse.json(
      { success: false, error: error.message, errors: error.errors || undefined },
      { status: error.status }
    );
  }
  console.error("Footer text request failed", error);
  return NextResponse.json({ success: false, error: "That couldn't be done right now. Try again." }, { status: 500 });
}

export async function GET() {
  const auth = await requireStaffPermission("content.view");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    return NextResponse.json({ success: true, data: await listFooterTexts() });
  } catch (error) {
    return failure(error);
  }
}

// Body: `{ entries: [{ path, content }, ...] }`, the all-pages text first.
export async function PUT(request) {
  const auth = await requireStaffPermission("content.edit");
  if (!auth.ok) return permissionDeniedResponse(auth);

  const body = await readJsonObject(request);
  if (!body || !Array.isArray(body.entries)) return invalidRequest();

  try {
    const entries = await saveFooterTexts(body.entries, auth.user);
    await logAdminActivity({
      actor: auth.user,
      action: "content.updated",
      entityType: "content",
      entityId: null,
      title: "Footer text updated",
      description: `saved the footer text for ${entries.length - 1} page${entries.length === 2 ? "" : "s"} and the default.`,
      severity: "info",
    });
    return NextResponse.json({ success: true, data: entries });
  } catch (error) {
    return failure(error);
  }
}
