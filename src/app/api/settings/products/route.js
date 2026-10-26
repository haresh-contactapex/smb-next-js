import { fail, ok, readJsonBody } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { logAdminActivity } from "@/lib/notifications";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { settingsPermission } from "@/lib/permissions";
import { getProductsSettings, updateProductsSettings } from "@/lib/productsSettings";
import {
  PRODUCT_STATUSES,
  WEIGHT_UNITS,
  isValidSkuPrefix,
  isValidLowStockThreshold,
} from "@/lib/shared/settingsProducts";

export async function GET() {
  const auth = await requireStaffPermission(settingsPermission("products", "view"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const data = await getProductsSettings();
    return ok(data);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}

export async function PUT(request) {
  const auth = await requireStaffPermission(settingsPermission("products", "edit"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const body = await readJsonBody(request);
    if (body.response) return body.response;
    const payload = body.payload;

    const settings = {
      skuPrefix: String(payload.skuPrefix || "").trim(),
      defaultStatus: String(payload.defaultStatus || "draft").trim(),
      defaultWeightUnit: String(payload.defaultWeightUnit || "lb").trim(),
      allowBackorders: Boolean(payload.allowBackorders),
      allowReviews: Boolean(payload.allowReviews),
      showLowStockBadge: Boolean(payload.showLowStockBadge),
      lowStockThreshold: String(payload.lowStockThreshold || "").trim(),
    };

    if (!settings.skuPrefix) {
      return fail("SKU prefix is required.", 400);
    }
    if (!isValidSkuPrefix(settings.skuPrefix)) {
      return fail("SKU prefix can only contain up to 20 letters, numbers and dashes.", 400);
    }
    if (!PRODUCT_STATUSES.some((s) => s.value === settings.defaultStatus)) {
      return fail("Select a valid default product status.", 400);
    }
    if (!WEIGHT_UNITS.some((u) => u.value === settings.defaultWeightUnit)) {
      return fail("Select a valid default weight unit.", 400);
    }
    if (!settings.lowStockThreshold) {
      return fail("Low stock threshold is required.", 400);
    }
    if (!isValidLowStockThreshold(settings.lowStockThreshold)) {
      return fail("Enter a whole number of 0 or more for the low stock threshold.", 400);
    }

    const updated = await updateProductsSettings(settings);

    await logAdminActivity({

      actor: auth.user,

      action: "settings.updated",

      entityType: "settings",

      entityId: "products",

      title: "Settings updated: products",

      description: `  changed the products settings.`,

      severity: "warning",

      metadata: { fields: Object.keys(settings) },

    });
    return ok(updated);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
