import { NextResponse } from "next/server";
import { getCurrentStaffUser } from "@/lib/auth/staffSession";
import { getOrdersSettings, updateOrdersSettings } from "@/lib/ordersSettings";
import {
  ORDER_STATUSES,
  MIN_AUTO_CANCEL_HOURS,
  isValidOrderNumberPrefix,
  isValidStartingOrderNumber,
  isValidAutoCancelHours,
} from "@/components/settings-orders/helpers";

export async function GET() {
  const staffUser = await getCurrentStaffUser();
  if (!staffUser) {
    return NextResponse.json({ success: false, error: "Not signed in." }, { status: 401 });
  }

  try {
    const data = await getOrdersSettings();
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
      orderNumberPrefix: String(payload.orderNumberPrefix || "").trim(),
      startingOrderNumber: String(payload.startingOrderNumber || "").trim(),
      autoCancelHours: String(payload.autoCancelHours || "").trim(),
      defaultOrderStatus: String(payload.defaultOrderStatus || "Pending").trim(),
      requireConfirmationEmail: Boolean(payload.requireConfirmationEmail),
      allowOrderEdits: Boolean(payload.allowOrderEdits),
    };

    if (!settings.orderNumberPrefix) {
      return NextResponse.json({ success: false, error: "Order number prefix is required." }, { status: 400 });
    }
    if (!isValidOrderNumberPrefix(settings.orderNumberPrefix)) {
      return NextResponse.json(
        { success: false, error: "Order number prefix can only contain up to 20 letters, numbers and dashes." },
        { status: 400 }
      );
    }
    if (!settings.startingOrderNumber) {
      return NextResponse.json({ success: false, error: "Starting order number is required." }, { status: 400 });
    }
    if (!isValidStartingOrderNumber(settings.startingOrderNumber)) {
      return NextResponse.json(
        { success: false, error: "Enter a whole number of 0 or more for the starting order number." },
        { status: 400 }
      );
    }
    if (!settings.autoCancelHours) {
      return NextResponse.json({ success: false, error: "Auto-cancel window is required." }, { status: 400 });
    }
    if (!isValidAutoCancelHours(settings.autoCancelHours)) {
      return NextResponse.json(
        {
          success: false,
          error: `Enter a whole number of ${MIN_AUTO_CANCEL_HOURS} or more for the auto-cancel window.`,
        },
        { status: 400 }
      );
    }
    if (!ORDER_STATUSES.some((s) => s.value === settings.defaultOrderStatus)) {
      return NextResponse.json({ success: false, error: "Select a valid default order status." }, { status: 400 });
    }

    const updated = await updateOrdersSettings(settings);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
