import { NextResponse } from "next/server";
import { findCustomerByEmail } from "@/lib/customers";
import { insertCustomerResetToken } from "@/lib/passwordResetTokens";
import { createResetToken } from "@/lib/auth/resetToken";
import { checkRecaptchaIfEnabled } from "@/lib/auth/recaptcha";
import { checkMaintenanceMode } from "@/lib/systemMaintenanceSettings";
import { isValidEmail } from "@/components/auth/helpers";
import { isEmailConfigured, sendPasswordResetEmail } from "@/lib/email";
import { getTrustedOrigin } from "@/lib/siteUrl";

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

    const origin = getTrustedOrigin(request);
    if (!origin) {
      console.error("[forgot-password] SITE_URL is not set; refusing to build a reset link from the request host");
      return NextResponse.json(
        { success: false, error: "Password reset isn't available right now. Please try again later." },
        { status: 503 }
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

    const resetLink = `${origin}/reset-password?token=${rawToken}`;

    if (await isEmailConfigured()) {
      const sent = await sendPasswordResetEmail({ to: email, resetLink });
      if (!sent) {
        console.error(`[forgot-password] failed to send reset email to ${email}`);
        return NextResponse.json(
          { success: false, error: "We couldn't send the reset email. Please try again later." },
          { status: 502 }
        );
      }
    } else if (process.env.NODE_ENV !== "production") {
      // No SMTP configured — log the link so the flow stays testable locally.
      console.log(`[forgot-password] reset link for ${email}: ${resetLink}`);
    } else {
      console.error("[forgot-password] email is not configured; no reset link was sent");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
