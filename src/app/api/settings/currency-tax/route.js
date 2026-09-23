import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { settingsPermission } from "@/lib/permissions";
import { getCurrencyTaxSettings, updateCurrencyTaxSettings } from "@/lib/currencyTaxSettings";
import { CURRENCIES } from "@/data/accountData";
import {
  CURRENCY_POSITIONS,
  NUMBER_FORMATS,
  isValidTaxRate,
  isValidTaxRegistrationNumber,
} from "@/components/settings-currency-tax/helpers";

export async function GET() {
  const auth = await requireStaffPermission(settingsPermission("currency-tax", "view"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const data = await getCurrencyTaxSettings();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const auth = await requireStaffPermission(settingsPermission("currency-tax", "edit"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const payload = await request.json();

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
      return NextResponse.json({ success: false, error: "Select a valid currency." }, { status: 400 });
    }
    if (!CURRENCY_POSITIONS.some((p) => p.value === settings.currencyPosition)) {
      return NextResponse.json({ success: false, error: "Select a valid currency position." }, { status: 400 });
    }
    if (!NUMBER_FORMATS.some((f) => f.value === settings.numberFormat)) {
      return NextResponse.json({ success: false, error: "Select a valid number format." }, { status: 400 });
    }
    if (!settings.defaultTaxRate) {
      return NextResponse.json({ success: false, error: "Default tax rate is required." }, { status: 400 });
    }
    if (!isValidTaxRate(settings.defaultTaxRate)) {
      return NextResponse.json({ success: false, error: "Enter a tax rate between 0 and 100." }, { status: 400 });
    }
    if (settings.taxRegistrationNumber && !isValidTaxRegistrationNumber(settings.taxRegistrationNumber)) {
      return NextResponse.json(
        { success: false, error: "Tax registration number can only contain letters, numbers, spaces and dashes." },
        { status: 400 }
      );
    }

    const updated = await updateCurrencyTaxSettings(settings);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
