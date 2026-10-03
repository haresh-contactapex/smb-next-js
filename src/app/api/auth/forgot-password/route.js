import { NextResponse } from "next/server";
import { findCustomerByEmail } from "@/lib/customers";
import { insertCustomerResetToken } from "@/lib/passwordResetTokens";
import { createResetToken } from "@/lib/auth/resetToken";
import { checkRecaptchaIfEnabled } from "@/lib/auth/recaptcha";
import { checkMaintenanceMode } from "@/lib/systemMaintenanceSettings";
import { isValidEmail } from "@/components/auth/helpers";
import { isEmailConfigured, sendPasswordResetEmail } from "@/lib/email";

// Tells the requester when no customer account matches the email, so they
// aren't told a reset link was sent when nothing was. This does reveal which
// emails are registered; the reCAPTCHA check above limits automated probing.
export async function POST(request) {
  try {
    const maintenance = await checkMaintenanceMode();
    if (maintenance.active) {
      return NextResponse.json({ success: false, error: maintenance.message }, { status: 503 });
    }

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
    if (!customer) {
      return NextResponse.json(
        { success: false, error: "No account was found with that email address." },
        { status: 404 }
      );
    }

    const { rawToken, tokenHash, expiresAt } = createResetToken();
    await insertCustomerResetToken({
      customerId: customer.id,
      tokenHash,
      requestedEmail: email,
      expiresAt,
    });

    const resetLink = `${new URL(request.url).origin}/reset-password?token=${rawToken}`;

    if (await isEmailConfigured()) {
      const sent = await sendPasswordResetEmail({ to: email, resetLink });
      if (!sent) {
        console.error(`[forgot-password] failed to send reset email to ${email}`);
        return NextResponse.json(
          { success: false, error: "We couldn't send the reset email. Please try again later." },
          { status: 502 }
        );
      }
    } else {
      // No SMTP configured — log the link so the flow stays testable locally.
      console.log(`[forgot-password] reset link for ${email}: ${resetLink}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
