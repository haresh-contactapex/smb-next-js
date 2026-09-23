import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { settingsPermission } from "@/lib/permissions";
import { getStoreSettings, updateStoreSettings } from "@/lib/storeSettings";
import { isValidEmail } from "@/components/auth/helpers";
import { isValidUsPhone } from "@/lib/phone";
import { isValidStoreUrl, BUSINESS_TYPES } from "@/components/settings-store/helpers";

export async function GET() {
  const auth = await requireStaffPermission(settingsPermission("store", "view"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const data = await getStoreSettings();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const auth = await requireStaffPermission(settingsPermission("store", "edit"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const payload = await request.json();

    const settings = {
      legalBusinessName: String(payload.legalBusinessName || "").trim(),
      businessType: String(payload.businessType || "LLC").trim(),
      storeUrl: String(payload.storeUrl || "").trim(),
      taxId: String(payload.taxId || "").trim(),
      supportEmail: String(payload.supportEmail || "").trim(),
      supportPhone: String(payload.supportPhone || "").trim(),
      supportHours: String(payload.supportHours || "").trim(),
      storeIsLive: Boolean(payload.storeIsLive),
    };

    if (!settings.legalBusinessName) {
      return NextResponse.json({ success: false, error: "Legal business name is required." }, { status: 400 });
    }
    if (!BUSINESS_TYPES.includes(settings.businessType)) {
      return NextResponse.json({ success: false, error: "Select a valid business type." }, { status: 400 });
    }
    if (!settings.storeUrl) {
      return NextResponse.json({ success: false, error: "Store URL is required." }, { status: 400 });
    }
    if (!isValidStoreUrl(settings.storeUrl)) {
      return NextResponse.json({ success: false, error: "Enter a valid store URL." }, { status: 400 });
    }
    if (!isValidEmail(settings.supportEmail)) {
      return NextResponse.json({ success: false, error: "Enter a valid support email address." }, { status: 400 });
    }
    if (!settings.supportPhone) {
      return NextResponse.json({ success: false, error: "Support phone number is required." }, { status: 400 });
    }
    if (!isValidUsPhone(settings.supportPhone)) {
      return NextResponse.json(
        { success: false, error: "Enter a valid 10-digit US phone number." },
        { status: 400 }
      );
    }

    const updated = await updateStoreSettings(settings);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
