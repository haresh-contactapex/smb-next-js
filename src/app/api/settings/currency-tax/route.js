import { fail, ok, readJsonBody } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { logAdminActivity } from "@/lib/notifications";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { settingsPermission } from "@/lib/permissions";
import { getCurrencyTaxSettings, updateCurrencyTaxSettings } from "@/lib/currencyTaxSettings";
import { CURRENCIES } from "@/data/accountData";
import {
  CURRENCY_POSITIONS,
  NUMBER_FORMATS,
  isValidTaxRate,
  isValidTaxRegistrationNumber,
} from "@/lib/shared/settingsCurrencyTax";

export async function GET() {
  const auth = await requireStaffPermission(settingsPermission("currency-tax", "view"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const data = await getCurrencyTaxSettings();
    return ok(data);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}

export async function PUT(request) {
  const auth = await requireStaffPermission(settingsPermission("currency-tax", "edit"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const body = await readJsonBody(request);
    if (body.response) return body.response;
    const payload = body.payload;

    const settings = {
      currency: String(payload.currency || "USD").trim(),
      currencyPosition: String(payload.currencyPosition || "before").trim(),
      numberFormat: String(payload.numberFormat || "1,234.56").trim(),
      pricesIncludeTax: Boolean(payload.pricesIncludeTax),
      defaultTaxRate: String(payload.defaultTaxRate || "").trim(),
      taxRegistrationNumber: String(payload.taxRegistrationNumber || "").trim(),
      applyTaxToShipping: Boolean(payload.applyTaxToShipping),
      enableTaxExemptGroups: Boolean(payload.enableTaxExemptGroups),
    };

    if (!CURRENCIES.some((c) => c.value === settings.currency)) {
      return fail("Select a valid currency.", 400);
    }
    if (!CURRENCY_POSITIONS.some((p) => p.value === settings.currencyPosition)) {
      return fail("Select a valid currency position.", 400);
    }
    if (!NUMBER_FORMATS.some((f) => f.value === settings.numberFormat)) {
      return fail("Select a valid number format.", 400);
    }
    if (!settings.defaultTaxRate) {
      return fail("Default tax rate is required.", 400);
    }
    if (!isValidTaxRate(settings.defaultTaxRate)) {
      return fail("Enter a tax rate between 0 and 100.", 400);
    }
    if (settings.taxRegistrationNumber && !isValidTaxRegistrationNumber(settings.taxRegistrationNumber)) {
      return fail("Tax registration number can only contain letters, numbers, spaces and dashes.", 400);
    }

    const updated = await updateCurrencyTaxSettings(settings);

    await logAdminActivity({

      actor: auth.user,

      action: "settings.updated",

      entityType: "settings",

      entityId: "currency-tax",

      title: "Settings updated: currency-tax",

      description: `  changed the currency-tax settings.`,

      severity: "warning",

      metadata: { fields: Object.keys(settings) },

    });
    return ok(updated);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
