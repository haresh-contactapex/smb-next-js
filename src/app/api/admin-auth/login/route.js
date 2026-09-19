import { NextResponse } from "next/server";
import { findStaffByEmail, toPublicStaffUser, touchStaffLastLogin } from "@/lib/staff";
import { verifyPassword } from "@/lib/auth/password";
import { createStaffSession } from "@/lib/auth/staffSession";
import { isValidEmail } from "@/components/auth/helpers";

const INVALID_CREDENTIALS_ERROR = "Incorrect email or password.";

export async function POST(request) {
  try {
    const payload = await request.json();
    const email = String(payload.email || "").trim();
    const password = String(payload.password || "");

    if (!isValidEmail(email) || !password) {
      return NextResponse.json({ success: false, error: INVALID_CREDENTIALS_ERROR }, { status: 400 });
    }

    const staffUser = await findStaffByEmail(email);
    const passwordMatches = staffUser && (await verifyPassword(password, staffUser.password_hash));
    if (!passwordMatches) {
      return NextResponse.json({ success: false, error: INVALID_CREDENTIALS_ERROR }, { status: 401 });
    }

    await createStaffSession(staffUser.id);
    await touchStaffLastLogin(staffUser.id);

    return NextResponse.json({ success: true, data: toPublicStaffUser(staffUser) });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
