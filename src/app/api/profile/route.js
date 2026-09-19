import { NextResponse } from "next/server";
import { getCurrentStaffUser } from "@/lib/auth/staffSession";
import { updateStaffProfile } from "@/lib/staff";
import { isValidEmail } from "@/components/auth/helpers";
import { isValidUsPhone } from "@/lib/phone";

export async function GET() {
  const staffUser = await getCurrentStaffUser();
  if (!staffUser) {
    return NextResponse.json({ success: false, error: "Not signed in." }, { status: 401 });
  }
  return NextResponse.json({ success: true, data: staffUser });
}

export async function PUT(request) {
  const staffUser = await getCurrentStaffUser();
  if (!staffUser) {
    return NextResponse.json({ success: false, error: "Not signed in." }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const firstName = String(payload.firstName || "").trim();
    const lastName = String(payload.lastName || "").trim();
    const email = String(payload.email || "").trim();
    const phone = String(payload.phone || "").trim();

    if (!firstName || !lastName) {
      return NextResponse.json({ success: false, error: "First and last name are required." }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, error: "Enter a valid email address." }, { status: 400 });
    }
    if (!isValidUsPhone(phone)) {
      return NextResponse.json(
        { success: false, error: "Enter a valid 10-digit US phone number." },
        { status: 400 }
      );
    }

    const updated = await updateStaffProfile(staffUser.id, {
      firstName,
      lastName,
      email,
      phone,
      bio: String(payload.bio || "").trim(),
      avatarUrl: payload.avatarUrl || null,
      language: payload.language || "en",
      timezone: payload.timezone || "UTC+00:00",
      twoFactorEnabled: Boolean(payload.twoFactorEnabled),
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error.message?.includes("users_email_key")) {
      return NextResponse.json(
        { success: false, error: "That email address is already in use." },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
