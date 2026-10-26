import { NextResponse } from "next/server";
import { fail, ok, readJsonBody } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { getCurrentStaffUser } from "@/lib/auth/staffSession";
import { getAddressesByUserId, upsertAddress, deleteAddress } from "@/lib/addresses";
import { validateTypedLocation } from "@/lib/validateAddress";
import { validateUsLocation } from "@/lib/usAddress";
import { isValidUsPhone } from "@/lib/phone";

const VALID_TYPES = new Set(["billing", "shipping"]);

export async function GET() {
  const staffUser = await getCurrentStaffUser();
  if (!staffUser) {
    return fail("Not signed in.", 401);
  }

  try {
    const data = await getAddressesByUserId(staffUser.id);
    return ok(data);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}

export async function PUT(request) {
  const staffUser = await getCurrentStaffUser();
  if (!staffUser) {
    return fail("Not signed in.", 401);
  }

  try {
    const body = await readJsonBody(request);
    if (body.response) return body.response;
    const payload = body.payload;
    const type = String(payload.type || "").toLowerCase();
    if (!VALID_TYPES.has(type)) {
      return fail("Address type must be billing or shipping.", 400);
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
      return fail("Full name and street address are required.", 400);
    }
    if (!isValidUsPhone(address.phone)) {
      return fail("Enter a valid 10-digit US phone number.", 400);
    }

    if (!address.country) {
      return fail("Select a country.", 400, { field: "country" });
    }
    if (!address.state || !address.city) {
      return fail("State and city are required.", 400, { field: !address.state ? "state" : "city" });
    }

    // Only a United States address is checked (state, city and ZIP must agree and the
    // ZIP must exist), the same rules as the storefront checkout. Other countries are
    // stored as typed.
    if (address.country === "United States") {
      const location = validateTypedLocation({
        country: address.country,
        state: address.state,
        city: address.city,
        postalCode: address.zip,
      });
      if (!location.valid) {
        return fail(location.message, 400, { field: location.field });
      }
      const usLocation = validateUsLocation({
        country: address.country,
        state: location.state,
        city: location.city,
        postalCode: address.zip,
      });
      if (!usLocation.valid) {
        return fail(usLocation.message, 400, { field: usLocation.field });
      }
      address.state = location.state;
      address.city = usLocation.city || location.city;
    }

    const saved = await upsertAddress(staffUser.id, type, address);
    return ok(saved);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}

export async function DELETE(request) {
  const staffUser = await getCurrentStaffUser();
  if (!staffUser) {
    return fail("Not signed in.", 401);
  }

  const type = new URL(request.url).searchParams.get("type")?.toLowerCase();
  if (!VALID_TYPES.has(type)) {
    return fail("Address type must be billing or shipping.", 400);
  }

  try {
    await deleteAddress(staffUser.id, type);
    return NextResponse.json({ success: true });
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
