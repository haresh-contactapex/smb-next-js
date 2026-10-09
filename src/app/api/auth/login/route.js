import { NextResponse } from "next/server";
import { findCustomerByEmail } from "@/lib/customers";
import { verifyPassword } from "@/lib/auth/password";
import { checkRecaptchaIfEnabled } from "@/lib/auth/recaptcha";
import { checkMaintenanceMode } from "@/lib/systemMaintenanceSettings";
import { isValidEmail, maskEmail } from "@/components/auth/helpers";
import { getSecuritySettings } from "@/lib/securitySettings";
import { finalizeCustomerLogin } from "@/lib/auth/finalizeCustomerLogin";
import { createCustomerTwoFactorChallenge } from "@/lib/auth/customer2faChallenge";
import { issueCustomerLoginOtp } from "@/lib/auth/customerLoginOtp";
import { OTP_TTL_MS } from "@/lib/auth/loginOtp";
import { sendLoginOtpEmail } from "@/lib/email";

const INVALID_CREDENTIALS_ERROR = "Incorrect email or password.";

export async function POST(request) {
  try {
    const maintenance = await checkMaintenanceMode();
    if (maintenance.active) {
      return NextResponse.json({ success: false, error: maintenance.message }, { status: 503 });
    }

    const payload = await request.json();
    const email = String(payload.email || "").trim();
    const password = String(payload.password || "");

    if (!isValidEmail(email) || !password) {
      return NextResponse.json({ success: false, error: INVALID_CREDENTIALS_ERROR }, { status: 400 });
    }

    const recaptcha = await checkRecaptchaIfEnabled(payload.recaptchaToken);
    if (recaptcha.required && !recaptcha.valid) {
      return NextResponse.json(
        { success: false, error: "reCAPTCHA verification failed. Please try again." },
        { status: 400 }
      );
    }

    const customer = await findCustomerByEmail(email);
    const passwordMatches = customer && (await verifyPassword(password, customer.password_hash));
    if (!passwordMatches) {
      return NextResponse.json({ success: false, error: INVALID_CREDENTIALS_ERROR }, { status: 401 });
    }

    const rememberMe = Boolean(payload.rememberMe);

    // A customer who opted in always owes a code; the store-wide switch asks
    // everyone. A settings read failure falls back to "not required" (same as
    // the staff flow) so a hiccup never blocks sign-in.
    const twoFactorRequired =
      Boolean(customer.two_factor_enabled) ||
      Boolean((await getSecuritySettings().catch(() => null))?.requireCustomerTwoFactor);

    if (twoFactorRequired) {
      const { code } = await issueCustomerLoginOtp({ customerId: customer.id, email: customer.email });
      const sent = await sendLoginOtpEmail({
        to: customer.email,
        firstName: customer.first_name,
        code,
        expiresInSeconds: OTP_TTL_MS / 1000,
        audience: "customer",
      });
      if (!sent) {
        // A code nobody receives is a dead end — fail the request rather than
        // strand the customer on an "enter your code" screen with nothing to enter.
        return NextResponse.json(
          { success: false, error: "We couldn't send your sign-in code. Please try again shortly." },
          { status: 503 }
        );
      }

      await createCustomerTwoFactorChallenge(customer.id, { rememberMe });
      return NextResponse.json({
        success: true,
        data: { twoFactorRequired: true, maskedEmail: maskEmail(customer.email), expiresInSeconds: OTP_TTL_MS / 1000 },
      });
    }

    return NextResponse.json({ success: true, data: await finalizeCustomerLogin(customer, { rememberMe }) });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
