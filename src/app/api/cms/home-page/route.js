import { fail, ok } from "@/lib/api";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { logAdminActivity } from "@/lib/notifications";
import { HomePageError, getHomePageForAdmin, saveHomePage } from "@/lib/homePage";
import { invalidRequest, readJsonObject } from "@/lib/cmsApi";

// CMS -> Home Page. GET returns the content; PUT replaces it.
// Both check the staff member's role here: middleware does not cover /api.

function failure(error) {
  if (error instanceof HomePageError) {
    return fail(error.message, error.status, { errors: error.errors || undefined });
  }
  console.error("Home page request failed", error);
  return fail("That couldn't be done right now. Try again.", 500);
}

export async function GET() {
  const auth = await requireStaffPermission("content.view");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    return ok(await getHomePageForAdmin());
  } catch (error) {
    return failure(error);
  }
}

// Body: the home page content object (see DEFAULT_HOME_PAGE in src/lib/shared/homePage.js).
export async function PUT(request) {
  const auth = await requireStaffPermission("content.edit");
  if (!auth.ok) return permissionDeniedResponse(auth);

  const body = await readJsonObject(request);
  if (!body) return invalidRequest();

  try {
    const content = await saveHomePage(body, auth.user);
    await logAdminActivity({
      actor: auth.user,
      action: "content.updated",
      entityType: "content",
      entityId: null,
      title: "Home page updated",
      description: "saved the storefront home page content.",
      severity: "info",
    });
    return ok(content);
  } catch (error) {
    return failure(error);
  }
}
