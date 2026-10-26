import { fail, ok, readJsonBody } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { logAdminActivity } from "@/lib/notifications";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { settingsPermission } from "@/lib/permissions";
import { getOrdersSettings, updateOrdersSettings } from "@/lib/ordersSettings";
import {
  ORDER_STATUSES,
  MIN_AUTO_CANCEL_HOURS,
  isValidOrderNumberPrefix,
  isValidStartingOrderNumber,
  isValidAutoCancelHours,
} from "@/lib/shared/settingsOrders";

export async function GET() {
  const auth = await requireStaffPermission(settingsPermission("orders", "view"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const data = await getOrdersSettings();
    return ok(data);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}

export async function PUT(request) {
  const auth = await requireStaffPermission(settingsPermission("orders", "edit"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const body = await readJsonBody(request);
    if (body.response) return body.response;
    const payload = body.payload;

    const settings = {
      orderNumberPrefix: String(payload.orderNumberPrefix || "").trim(),
      startingOrderNumber: String(payload.startingOrderNumber || "").trim(),
      autoCancelHours: String(payload.autoCancelHours || "").trim(),
      defaultOrderStatus: String(payload.defaultOrderStatus || "Pending").trim(),
      requireConfirmationEmail: Boolean(payload.requireConfirmationEmail),
      allowOrderEdits: Boolean(payload.allowOrderEdits),
    };

    if (!settings.orderNumberPrefix) {
      return fail("Order number prefix is required.", 400);
    }
    if (!isValidOrderNumberPrefix(settings.orderNumberPrefix)) {
      return fail("Order number prefix can only contain up to 20 letters, numbers and dashes.", 400);
    }
    if (!settings.startingOrderNumber) {
      return fail("Starting order number is required.", 400);
    }
    if (!isValidStartingOrderNumber(settings.startingOrderNumber)) {
      return fail("Enter a whole number of 0 or more for the starting order number.", 400);
    }
    if (!settings.autoCancelHours) {
      return fail("Auto-cancel window is required.", 400);
    }
    if (!isValidAutoCancelHours(settings.autoCancelHours)) {
      return fail(`Enter a whole number of ${MIN_AUTO_CANCEL_HOURS} or more for the auto-cancel window.`, 400);
    }
    if (!ORDER_STATUSES.some((s) => s.value === settings.defaultOrderStatus)) {
      return fail("Select a valid default order status.", 400);
    }

    const updated = await updateOrdersSettings(settings);

    await logAdminActivity({

      actor: auth.user,

      action: "settings.updated",

      entityType: "settings",

      entityId: "orders",

      title: "Settings updated: orders",

      description: `  changed the orders settings.`,

      severity: "warning",

      metadata: { fields: Object.keys(settings) },

    });
    return ok(updated);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
