import { NextResponse } from "next/server";
import { findCustomerByEmail } from "@/lib/customers";
import { insertCustomerResetToken } from "@/lib/passwordResetTokens";
import { createResetToken } from "@/lib/auth/resetToken";
import { checkRecaptchaIfEnabled } from "@/lib/auth/recaptcha";
import { isValidEmail } from "@/components/auth/helpers";
import { isEmailConfigured, sendPasswordResetEmail } from "@/lib/email";

// Always responds with success (whether or not the email matches an account)
// so this endpoint can't be used to enumerate registered customers.
export async function POST(request) {
  try {
    const payload = await request.json();
    const email = String(payload.email || "").trim();

    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, error: "Enter a valid email address." }, { status: 400 });
    }

    const recaptcha = await checkRecaptchaIfEnabled(payload.recaptchaToken);
    if (recaptcha.required && !recaptcha.valid) {
      return NextResponse.json(
        { success: false, error: "reCAPTCHA verification failed. Please try again." },
        { status: 400 }
      );
    }

    const customer = await findCustomerByEmail(email);
    if (customer) {
      const { rawToken, tokenHash, expiresAt } = createResetToken();
      await insertCustomerResetToken({
        customerId: customer.id,
        tokenHash,
        requestedEmail: email,
        expiresAt,
      });

      const resetLink = `${new URL(request.url).origin}/reset-password?token=${rawToken}`;

      if (isEmailConfigured()) {
        const sent = await sendPasswordResetEmail({ to: email, resetLink });
        if (!sent) {
          console.error(`[forgot-password] failed to send reset email to ${email}`);
        }
      } else {
        // No SMTP configured — log the link so the flow stays testable locally.
        console.log(`[forgot-password] reset link for ${email}: ${resetLink}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
