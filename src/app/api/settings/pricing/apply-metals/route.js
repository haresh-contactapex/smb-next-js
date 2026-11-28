import { fail, ok, readJsonBody } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { roleHasPermission, settingsPermission } from "@/lib/permissions";
import { applyMetalPriceAdjustment } from "@/lib/pricing";
import { parseApplyScope, parseMetalRules } from "@/lib/shared/settingsPricing";

export async function POST(request) {
  // Rewrites product and variant prices, so it needs product editing rights as well as
  // settings access (same gate as /api/settings/pricing/apply).
  const auth = await requireStaffPermission(settingsPermission("pricing", "edit"));
  if (!auth.ok) return permissionDeniedResponse(auth);
  if (!roleHasPermission(auth.role, "products.edit")) {
    return permissionDeniedResponse({ status: 403, error: "You don't have permission to change product prices." });
  }

  try {
    const body = await readJsonBody(request);
    if (body.response) return body.response;
    const payload = body.payload;

    const { rules, error: rulesError } = parseMetalRules(payload.metalRules);
    if (rulesError) return fail(rulesError, 400);

    const { categoryIds, error: scopeError } = parseApplyScope(payload);
    if (scopeError) return fail(scopeError, 400);

    const result = await applyMetalPriceAdjustment({ rules, categoryIds });
    return ok(result);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
