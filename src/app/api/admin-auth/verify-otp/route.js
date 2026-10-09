import { NextResponse } from "next/server";
import { getStaffTwoFactorChallengeUserId, clearStaffTwoFactorChallenge } from "@/lib/auth/staff2faChallenge";
import { verifyLoginOtp, LoginOtpError } from "@/lib/auth/loginOtp";
import { getStaffRowById } from "@/lib/staff";
import { finalizeStaffLogin } from "@/lib/auth/finalizeStaffLogin";

const NO_CHALLENGE_ERROR = "Your sign-in session has expired. Sign in again.";

export async function POST(request) {
  try {
    const userId = await getStaffTwoFactorChallengeUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: NO_CHALLENGE_ERROR, code: "no_challenge" }, { status: 401 });
    }

    const payload = await request.json().catch(() => ({}));
    const code = String(payload.code || "").trim();
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ success: false, error: "Enter the 6-digit code.", code: "invalid" }, { status: 400 });
    }

    try {
      await verifyLoginOtp(userId, code);
    } catch (error) {
      if (error instanceof LoginOtpError) {
        return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.status });
      }
      throw error;
    }

    const staffUser = await getStaffRowById(userId);
    await clearStaffTwoFactorChallenge();
    if (!staffUser) {
      return NextResponse.json({ success: false, error: "This account no longer exists.", code: "no_user" }, { status: 401 });
    }

    const data = await finalizeStaffLogin(staffUser);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
