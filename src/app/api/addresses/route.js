import { NextResponse } from "next/server";
import { getCurrentStaffUser } from "@/lib/auth/staffSession";
import { getAddressesByUserId, upsertAddress, deleteAddress } from "@/lib/addresses";
import { validateLocationHierarchy } from "@/lib/validateAddress";
import { isValidUsPhone } from "@/lib/phone";

const VALID_TYPES = new Set(["billing", "shipping"]);

export async function GET() {
  const staffUser = await getCurrentStaffUser();
  if (!staffUser) {
    return NextResponse.json({ success: false, error: "Not signed in." }, { status: 401 });
  }

  try {
    const data = await getAddressesByUserId(staffUser.id);
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
    const type = String(payload.type || "").toLowerCase();
    if (!VALID_TYPES.has(type)) {
      return NextResponse.json({ success: false, error: "Address type must be billing or shipping." }, { status: 400 });
    }

    const address = {
      fullName: String(payload.fullName || "").trim(),
      company: String(payload.company || "").trim(),
      addressLine1: String(payload.addressLine1 || "").trim(),
      addressLine2: String(payload.addressLine2 || "").trim(),
      city: String(payload.city || "").trim(),
      state: String(payload.state || "").trim(),
      zip: String(payload.zip || "").trim(),
      country: String(payload.country || "").trim(),
      phone: String(payload.phone || "").trim(),
      sameAsBilling: Boolean(payload.sameAsBilling),
      deliveryInstructions: String(payload.deliveryInstructions || "").trim(),
    };

    if (!address.fullName || !address.addressLine1) {
      return NextResponse.json(
        { success: false, error: "Full name and street address are required." },
        { status: 400 }
      );
    }
    if (!isValidUsPhone(address.phone)) {
      return NextResponse.json(
        { success: false, error: "Enter a valid 10-digit US phone number." },
        { status: 400 }
      );
    }

    const hierarchyResult = validateLocationHierarchy({
      country: address.country,
      state: address.state,
      city: address.city,
      postalCode: address.zip,
    });
    if (!hierarchyResult.valid) {
      return NextResponse.json({ success: false, error: hierarchyResult.message }, { status: 400 });
    }

    const saved = await upsertAddress(staffUser.id, type, address);
    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const staffUser = await getCurrentStaffUser();
  if (!staffUser) {
    return NextResponse.json({ success: false, error: "Not signed in." }, { status: 401 });
  }

  const type = new URL(request.url).searchParams.get("type")?.toLowerCase();
  if (!VALID_TYPES.has(type)) {
    return NextResponse.json({ success: false, error: "Address type must be billing or shipping." }, { status: 400 });
  }

  try {
    await deleteAddress(staffUser.id, type);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
