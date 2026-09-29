import { NextResponse } from "next/server";
import {
  findStaffByEmail,
  toPublicStaffUser,
  touchStaffLastLogin,
  isAccountLocked,
  registerFailedLogin,
  resetLoginAttempts,
} from "@/lib/staff";
import { verifyPassword } from "@/lib/auth/password";
import { createStaffSession } from "@/lib/auth/staffSession";
import { checkRecaptchaIfEnabled } from "@/lib/auth/recaptcha";
import { isValidEmail } from "@/components/auth/helpers";
import { getSecuritySettings } from "@/lib/securitySettings";
import { logAdminActivity } from "@/lib/notifications";

const INVALID_CREDENTIALS_ERROR = "Incorrect email or password.";
// "jane@shop.com" -> "j***@shop.com": enough to recognise, never the full address.
function maskEmail(email) {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 1)}***@${domain}`;
}

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
        const settings = await getSecuritySettings();
        await registerFailedLogin(staffUser.id, settings.maxLoginAttempts);
      }
      return NextResponse.json({ success: false, error: INVALID_CREDENTIALS_ERROR }, { status: 401 });
    }

    await resetLoginAttempts(staffUser.id);
    await createStaffSession(staffUser.id);
    await touchStaffLastLogin(staffUser.id);
    await logAdminActivity({
      actor: toPublicStaffUser(staffUser),
      action: "auth.login",
      entityType: "auth",
      entityId: staffUser.id,
      title: "Admin signed in",
      description: `${staffUser.first_name} ${staffUser.last_name} signed in.`,
    });

    return NextResponse.json({ success: true, data: toPublicStaffUser(staffUser) });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
