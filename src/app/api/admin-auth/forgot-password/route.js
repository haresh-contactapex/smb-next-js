import { NextResponse } from "next/server";
import { findStaffByEmail } from "@/lib/staff";
import { insertStaffResetToken } from "@/lib/passwordResetTokens";
import { createResetToken } from "@/lib/auth/resetToken";
import { isValidEmail } from "@/components/auth/helpers";

// Always responds with success (whether or not the email matches a staff
// account) so this endpoint can't be used to enumerate admin users.
export async function POST(request) {
  try {
    const payload = await request.json();
    const email = String(payload.email || "").trim();

    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, error: "Enter a valid email address." }, { status: 400 });
    }

    const staffUser = await findStaffByEmail(email);
    if (staffUser) {
      const { rawToken, tokenHash, expiresAt } = createResetToken();
      await insertStaffResetToken({
        userId: staffUser.id,
        tokenHash,
        requestedEmail: email,
        expiresAt,
      });

      const resetLink = `${new URL(request.url).origin}/admin/reset-password?token=${rawToken}`;
      console.log(`[admin-forgot-password] reset link for ${email}: ${resetLink}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
