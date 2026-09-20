import { NextResponse } from "next/server";
import { getCurrentStaffUser } from "@/lib/auth/staffSession";
import { getGeneralSettings, updateGeneralSettings } from "@/lib/generalSettings";
import { isValidEmail } from "@/components/auth/helpers";
import { isValidUsPhone } from "@/lib/phone";
import { validateLocationHierarchy } from "@/lib/validateAddress";

export async function GET() {
  const staffUser = await getCurrentStaffUser();
  if (!staffUser) {
    return NextResponse.json({ success: false, error: "Not signed in." }, { status: 401 });
  }

  try {
    const data = await getGeneralSettings();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const staffUser = await getCurrentStaffUser();
  if (!staffUser) {
    return NextResponse.json({ success: false, error: "Not signed in." }, { status: 401 });
  }

  try {
    const payload = await request.json();

    const settings = {
      storeName: String(payload.storeName || "").trim(),
      logoUrl: payload.logoUrl ? String(payload.logoUrl).trim() : null,
      faviconUrl: payload.faviconUrl ? String(payload.faviconUrl).trim() : null,
      storeEmail: String(payload.storeEmail || "").trim(),
      phone: String(payload.phone || "").trim(),
      address: String(payload.address || "").trim(),
      country: String(payload.country || "United States").trim(),
      state: String(payload.state || "").trim(),
      city: String(payload.city || "").trim(),
      zip: String(payload.zip || "").trim(),
      timezone: String(payload.timezone || "UTC+05:30").trim(),
      dateTimeFormat: String(payload.dateTimeFormat || "MM/DD/YYYY 12h").trim(),
      language: String(payload.language || "en").trim(),
    };

    if (!settings.storeName) {
      return NextResponse.json({ success: false, error: "Store name is required." }, { status: 400 });
    }
    if (!settings.logoUrl) {
      return NextResponse.json({ success: false, error: "A store logo is required." }, { status: 400 });
    }
    if (!settings.faviconUrl) {
      return NextResponse.json({ success: false, error: "A favicon is required." }, { status: 400 });
    }
    if (!isValidEmail(settings.storeEmail)) {
      return NextResponse.json({ success: false, error: "Enter a valid store email address." }, { status: 400 });
    }
    if (!settings.phone) {
      return NextResponse.json({ success: false, error: "Phone number is required." }, { status: 400 });
    }
    if (!isValidUsPhone(settings.phone)) {
      return NextResponse.json(
        { success: false, error: "Enter a valid 10-digit US phone number." },
        { status: 400 }
      );
    }
    if (!settings.address) {
      return NextResponse.json({ success: false, error: "Address is required." }, { status: 400 });
    }

    const hierarchyResult = validateLocationHierarchy({
      country: settings.country,
      state: settings.state,
      city: settings.city,
      postalCode: settings.zip,
    });
    if (!hierarchyResult.valid) {
      return NextResponse.json({ success: false, error: hierarchyResult.message }, { status: 400 });
    }

    const updated = await updateGeneralSettings(settings);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
