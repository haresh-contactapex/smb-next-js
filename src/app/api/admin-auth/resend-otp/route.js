import { NextResponse } from "next/server";
import { getStaffTwoFactorChallengeUserId } from "@/lib/auth/staff2faChallenge";
import { checkOtpRateLimit, issueLoginOtp, OTP_TTL_MS } from "@/lib/auth/loginOtp";
import { getStaffRowById } from "@/lib/staff";
import { sendLoginOtpEmail } from "@/lib/email";
import { logAdminActivity } from "@/lib/notifications";
import { maskEmail } from "@/components/auth/helpers";

const NO_CHALLENGE_ERROR = "Your sign-in session has expired. Sign in again.";

export async function POST() {
  try {
    const userId = await getStaffTwoFactorChallengeUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: NO_CHALLENGE_ERROR, code: "no_challenge" }, { status: 401 });
    }

    const rateLimit = await checkOtpRateLimit(userId);
    if (rateLimit) {
      return NextResponse.json(
        {
          success: false,
          error: `Please wait ${rateLimit.retryAfterSeconds}s before requesting another code.`,
          code: "rate_limited",
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    const staffUser = await getStaffRowById(userId);
    if (!staffUser) {
      return NextResponse.json({ success: false, error: "This account no longer exists.", code: "no_user" }, { status: 401 });
    }

    const { code } = await issueLoginOtp({ userId, email: staffUser.email });
    const sent = await sendLoginOtpEmail({
      to: staffUser.email,
      firstName: staffUser.first_name,
      code,
      expiresInSeconds: OTP_TTL_MS / 1000,
    });
    if (!sent) {
      return NextResponse.json(
        { success: false, error: "Couldn't send a new code. Check Settings → Email, or try again shortly." },
        { status: 503 }
      );
    }

    await logAdminActivity({
      action: "auth.otp_sent",
      entityType: "auth",
      entityId: staffUser.id,
      title: "Sign-in verification code resent",
      description: `Code resent to ${maskEmail(staffUser.email)}.`,
    });

    return NextResponse.json({ success: true, data: { expiresInSeconds: OTP_TTL_MS / 1000 } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
