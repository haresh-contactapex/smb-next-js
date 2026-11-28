import { fail, ok, readJsonBody } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { roleHasPermission, settingsPermission } from "@/lib/permissions";
import { previewMetalPriceAdjustment } from "@/lib/pricing";
import { parseApplyScope } from "@/lib/shared/settingsPricing";

// Read-only: counts what the metal rules would touch and returns a sample product. A POST so the
// category list travels in the body; nothing is written.
export async function POST(request) {
  const auth = await requireStaffPermission(settingsPermission("pricing", "edit"));
  if (!auth.ok) return permissionDeniedResponse(auth);
  if (!roleHasPermission(auth.role, "products.edit")) {
    return permissionDeniedResponse({ status: 403, error: "You don't have permission to change product prices." });
  }

  try {
    const body = await readJsonBody(request);
    if (body.response) return body.response;

    const { categoryIds, error: scopeError } = parseApplyScope(body.payload);
    if (scopeError) return fail(scopeError, 400);

    return ok(await previewMetalPriceAdjustment({ categoryIds }));
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
