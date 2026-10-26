import { fail, ok, readJsonBody } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { logAdminActivity } from "@/lib/notifications";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { settingsPermission } from "@/lib/permissions";
import { getPaymentSettings, updatePaymentSettings } from "@/lib/paymentSettings";
import { GATEWAY_CREDENTIAL_KEYS, validatePaymentSettingsForm } from "@/lib/shared/settingsPayment";

export async function GET() {
  const auth = await requireStaffPermission(settingsPermission("payment", "view"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const data = await getPaymentSettings();
    return ok(data);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}

export async function PUT(request) {
  const auth = await requireStaffPermission(settingsPermission("payment", "edit"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const body = await readJsonBody(request);
    if (body.response) return body.response;
    const payload = body.payload;

    const settings = {
      stripeEnabled: Boolean(payload.stripeEnabled),
      paypalEnabled: Boolean(payload.paypalEnabled),
      razorpayEnabled: Boolean(payload.razorpayEnabled),
      codEnabled: Boolean(payload.codEnabled),
      ...Object.fromEntries(
        GATEWAY_CREDENTIAL_KEYS.map((key) => [key, String(payload[key] || "").trim().slice(0, 255)]),
      ),
      paypalEnvironment: String(payload.paypalEnvironment ?? "").trim(),
      transactionFee: String(payload.transactionFee ?? "").trim(),
      codMinOrder: String(payload.codMinOrder ?? "").trim(),
      autoCapture: Boolean(payload.autoCapture),
    };

    const result = validatePaymentSettingsForm(settings);
    if (!result.valid) {
      return fail(result.message, 400);
    }

    const updated = await updatePaymentSettings(settings);

    await logAdminActivity({
      actor: auth.user,
      action: "settings.updated",
      entityType: "settings",
      entityId: "payment",
      title: "Settings updated: payment",
      description: "  changed the payment settings.",
      severity: "warning",
      // Field names only, never the key values.
      metadata: { fields: Object.keys(settings) },
    });
    return ok(updated);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
