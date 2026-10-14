import { NextResponse } from "next/server";
import { publicErrorMessage } from "@/lib/publicError";
import { createStaffSession, getCurrentStaffUser } from "@/lib/auth/staffSession";
import { checkStaffCurrentPassword } from "@/lib/auth/staffReauth";
import { revokeStaffSessions } from "@/lib/auth/sessionRevocation";
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

    // The email decides where reset links go and two-factor is the second lock on the account,
    // so changing either needs the current password: a stolen session cookie alone must not be
    // enough to take the account over for good.
    const twoFactorEnabled = Boolean(payload.twoFactorEnabled);
    const emailChanged = email.toLowerCase() !== String(staffUser.email || "").toLowerCase();
    const twoFactorChanged = twoFactorEnabled !== Boolean(staffUser.twoFactorEnabled);
    const sensitiveChange = emailChanged || twoFactorChanged;
    if (sensitiveChange) {
      const rejection = await checkStaffCurrentPassword(staffUser.id, payload.currentPassword);
      if (rejection) {
        return NextResponse.json({ success: false, error: rejection.error, field: rejection.field }, { status: rejection.status });
      }
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
      twoFactorEnabled,
    });

    if (sensitiveChange) {
      // Any other session (a stolen cookie, an old browser) is signed out; this one gets a fresh token.
      await revokeStaffSessions(staffUser.id);
      await createStaffSession(staffUser.id);
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error.message?.includes("users_email_key")) {
      return NextResponse.json(
        { success: false, error: "That email address is already in use." },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, error: publicErrorMessage(error) }, { status: 500 });
  }
}
