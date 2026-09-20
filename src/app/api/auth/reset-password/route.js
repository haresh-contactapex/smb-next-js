import { NextResponse } from "next/server";
import { findCustomerResetToken, markCustomerResetTokenUsed } from "@/lib/passwordResetTokens";
import { updateCustomerPassword } from "@/lib/customers";
import { hashPassword } from "@/lib/auth/password";
import { hashResetToken } from "@/lib/auth/resetToken";
import { checkRecaptchaIfEnabled } from "@/lib/auth/recaptcha";
import { isValidPassword, getPasswordErrorMessage } from "@/components/auth/helpers";

export async function POST(request) {
  try {
    const payload = await request.json();
    const token = String(payload.token || "");
    const password = String(payload.password || "");

    if (!token) {
      return NextResponse.json({ success: false, error: "Reset link is missing its token." }, { status: 400 });
    }
    if (!isValidPassword(password)) {
      return NextResponse.json(
        { success: false, error: getPasswordErrorMessage(password) || "Enter a valid password." },
        { status: 400 }
      );
    }

    const recaptcha = await checkRecaptchaIfEnabled(payload.recaptchaToken);
    if (recaptcha.required && !recaptcha.valid) {
      return NextResponse.json(
        { success: false, error: "reCAPTCHA verification failed. Please try again." },
        { status: 400 }
      );
    }

    const resetToken = await findCustomerResetToken(hashResetToken(token));
    if (!resetToken) {
      return NextResponse.json({ success: false, error: "This reset link is invalid." }, { status: 400 });
    }
    if (resetToken.used_at) {
      return NextResponse.json(
        { success: false, error: "This reset link has already been used." },
        { status: 400 }
      );
    }
    if (new Date(resetToken.expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: "This reset link has expired." }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    await updateCustomerPassword(resetToken.customer_id, passwordHash);
    await markCustomerResetTokenUsed(resetToken.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
