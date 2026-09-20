import { NextResponse } from "next/server";
import { getCurrentStaffUser } from "@/lib/auth/staffSession";
import { getProductsSettings, updateProductsSettings } from "@/lib/productsSettings";
import {
  PRODUCT_STATUSES,
  WEIGHT_UNITS,
  isValidSkuPrefix,
  isValidLowStockThreshold,
} from "@/components/settings-products/helpers";

export async function GET() {
  const staffUser = await getCurrentStaffUser();
  if (!staffUser) {
    return NextResponse.json({ success: false, error: "Not signed in." }, { status: 401 });
  }

  try {
    const data = await getProductsSettings();
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
      skuPrefix: String(payload.skuPrefix || "").trim(),
      defaultStatus: String(payload.defaultStatus || "draft").trim(),
      defaultWeightUnit: String(payload.defaultWeightUnit || "lb").trim(),
      allowBackorders: Boolean(payload.allowBackorders),
      allowReviews: Boolean(payload.allowReviews),
      showLowStockBadge: Boolean(payload.showLowStockBadge),
      lowStockThreshold: String(payload.lowStockThreshold || "").trim(),
    };

    if (!settings.skuPrefix) {
      return NextResponse.json({ success: false, error: "SKU prefix is required." }, { status: 400 });
    }
    if (!isValidSkuPrefix(settings.skuPrefix)) {
      return NextResponse.json(
        { success: false, error: "SKU prefix can only contain up to 20 letters, numbers and dashes." },
        { status: 400 }
      );
    }
    if (!PRODUCT_STATUSES.some((s) => s.value === settings.defaultStatus)) {
      return NextResponse.json({ success: false, error: "Select a valid default product status." }, { status: 400 });
    }
    if (!WEIGHT_UNITS.some((u) => u.value === settings.defaultWeightUnit)) {
      return NextResponse.json({ success: false, error: "Select a valid default weight unit." }, { status: 400 });
    }
    if (!settings.lowStockThreshold) {
      return NextResponse.json({ success: false, error: "Low stock threshold is required." }, { status: 400 });
    }
    if (!isValidLowStockThreshold(settings.lowStockThreshold)) {
      return NextResponse.json(
        { success: false, error: "Enter a whole number of 0 or more for the low stock threshold." },
        { status: 400 }
      );
    }

    const updated = await updateProductsSettings(settings);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
