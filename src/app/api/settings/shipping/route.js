import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { settingsPermission } from "@/lib/permissions";
import { getShippingSettings, updateShippingSettings } from "@/lib/shippingSettings";
import {
  CARRIERS,
  WEIGHT_UNITS,
  DIMENSION_UNITS,
  isValidMoneyAmount,
  isValidProcessingTimeDays,
} from "@/components/settings-shipping/helpers";

export async function GET() {
  const auth = await requireStaffPermission(settingsPermission("shipping", "view"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const data = await getShippingSettings();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const auth = await requireStaffPermission(settingsPermission("shipping", "edit"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const payload = await request.json();

    const settings = {
      defaultCarrier: String(payload.defaultCarrier || "USPS").trim(),
      flatRateFee: String(payload.flatRateFee || "").trim(),
      freeShippingThreshold: String(payload.freeShippingThreshold || "").trim(),
      processingTimeDays: String(payload.processingTimeDays || "").trim(),
      weightUnit: String(payload.weightUnit || "lb").trim(),
      dimensionUnit: String(payload.dimensionUnit || "in").trim(),
      localPickupEnabled: Boolean(payload.localPickupEnabled),
    };

    if (!CARRIERS.includes(settings.defaultCarrier)) {
      return NextResponse.json({ success: false, error: "Select a valid default carrier." }, { status: 400 });
    }
    if (!settings.flatRateFee) {
      return NextResponse.json({ success: false, error: "Flat rate shipping fee is required." }, { status: 400 });
    }
    if (!isValidMoneyAmount(settings.flatRateFee)) {
      return NextResponse.json(
        { success: false, error: "Enter a flat rate shipping fee of 0 or more, with up to 2 decimal places." },
        { status: 400 }
      );
    }
    if (!settings.freeShippingThreshold) {
      return NextResponse.json({ success: false, error: "Free shipping threshold is required." }, { status: 400 });
    }
    if (!isValidMoneyAmount(settings.freeShippingThreshold)) {
      return NextResponse.json(
        { success: false, error: "Enter a free shipping threshold of 0 or more, with up to 2 decimal places." },
        { status: 400 }
      );
    }
    if (!settings.processingTimeDays) {
      return NextResponse.json({ success: false, error: "Order processing time is required." }, { status: 400 });
    }
    if (!isValidProcessingTimeDays(settings.processingTimeDays)) {
      return NextResponse.json(
        { success: false, error: "Enter a whole number of 0 or more for the order processing time." },
        { status: 400 }
      );
    }
    if (!WEIGHT_UNITS.some((u) => u.value === settings.weightUnit)) {
      return NextResponse.json({ success: false, error: "Select a valid weight unit." }, { status: 400 });
    }
    if (!DIMENSION_UNITS.includes(settings.dimensionUnit)) {
      return NextResponse.json({ success: false, error: "Select a valid dimension unit." }, { status: 400 });
    }

    const updated = await updateShippingSettings(settings);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
