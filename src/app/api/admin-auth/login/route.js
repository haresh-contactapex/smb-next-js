import { NextResponse } from "next/server";
import {
  findStaffByEmail,
  isAccountLocked,
  registerFailedLogin,
  resetLoginAttempts,
} from "@/lib/staff";
import { verifyPassword } from "@/lib/auth/password";
import { checkRecaptchaIfEnabled } from "@/lib/auth/recaptcha";
import { isValidEmail, maskEmail } from "@/components/auth/helpers";
import { getSecuritySettings } from "@/lib/securitySettings";
import { logAdminActivity } from "@/lib/notifications";
import { finalizeStaffLogin } from "@/lib/auth/finalizeStaffLogin";
import { createStaffTwoFactorChallenge } from "@/lib/auth/staff2faChallenge";
import { issueLoginOtp, OTP_TTL_MS } from "@/lib/auth/loginOtp";
import { sendLoginOtpEmail } from "@/lib/email";

const INVALID_CREDENTIALS_ERROR = "Incorrect email or password.";
const LOCKED_ACCOUNT_ERROR = "Too many failed attempts. This account is temporarily locked — try again later.";

export async function POST(request) {
  try {
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

    const staffUser = await findStaffByEmail(email);

    if (staffUser && isAccountLocked(staffUser)) {
      await logAdminActivity({
        action: "auth.login_blocked",
        entityType: "auth",
        title: "Sign-in blocked: account locked",
        description: `${maskEmail(email)} tried to sign in while locked out.`,
        severity: "warning",
      });
      return NextResponse.json({ success: false, error: LOCKED_ACCOUNT_ERROR }, { status: 423 });
    }

    // Needed either way: to size the lockout on a wrong password below, or to
    // check the global "Require Two-Factor Auth" toggle once it matches. A
    // fresh/unmigrated environment must still allow signing in, so a read
    // failure here falls back to "no policy configured" rather than failing
    // the request (same fallback used throughout for settings reads).
    const settings = staffUser ? await getSecuritySettings().catch(() => null) : null;

    const passwordMatches = staffUser && (await verifyPassword(password, staffUser.password_hash));
    if (!passwordMatches) {
      await logAdminActivity({
        action: "auth.login_failed",
        entityType: "auth",
        title: "Failed sign-in attempt",
        description: `Incorrect credentials for ${maskEmail(email)}.`,
        severity: "warning",
      });
      if (staffUser) {
        await registerFailedLogin(staffUser.id, settings?.maxLoginAttempts);
      }
      return NextResponse.json({ success: false, error: INVALID_CREDENTIALS_ERROR }, { status: 401 });
    }

    await resetLoginAttempts(staffUser.id);

    const twoFactorRequired = Boolean(staffUser.two_factor_enabled) || Boolean(settings?.requireTwoFactorAuth);
    if (twoFactorRequired) {
      const { code } = await issueLoginOtp({ userId: staffUser.id, email: staffUser.email });
      const sent = await sendLoginOtpEmail({
        to: staffUser.email,
        firstName: staffUser.first_name,
        code,
        expiresInSeconds: OTP_TTL_MS / 1000,
      });
      if (!sent) {
        // Unlike other best-effort emails, a code nobody receives is a dead
        // end — fail the request rather than strand the user on an "enter
        // your code" screen with nothing to enter.
        return NextResponse.json(
          { success: false, error: "Couldn't send your sign-in code. Check Settings → Email, or try again shortly." },
          { status: 503 }
        );
      }

      await createStaffTwoFactorChallenge(staffUser.id);
      await logAdminActivity({
        action: "auth.otp_sent",
        entityType: "auth",
        entityId: staffUser.id,
        title: "Sign-in verification code sent",
        description: `Code sent to ${maskEmail(staffUser.email)}.`,
      });

      return NextResponse.json({
        success: true,
        data: { twoFactorRequired: true, maskedEmail: maskEmail(staffUser.email), expiresInSeconds: OTP_TTL_MS / 1000 },
      });
    }

    const data = await finalizeStaffLogin(staffUser);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
