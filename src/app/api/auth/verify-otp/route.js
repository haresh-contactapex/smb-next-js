import { NextResponse } from "next/server";
import { getCustomerTwoFactorChallenge, clearCustomerTwoFactorChallenge } from "@/lib/auth/customer2faChallenge";
import { verifyCustomerLoginOtp } from "@/lib/auth/customerLoginOtp";
import { LoginOtpError } from "@/lib/auth/loginOtp";
import { getCustomerRowById } from "@/lib/customers";
import { finalizeCustomerLogin } from "@/lib/auth/finalizeCustomerLogin";
import { checkMaintenanceMode } from "@/lib/systemMaintenanceSettings";

const NO_CHALLENGE_ERROR = "Your sign-in session has expired. Sign in again.";

export async function POST(request) {
  try {
    const maintenance = await checkMaintenanceMode();
    if (maintenance.active) {
      return NextResponse.json({ success: false, error: maintenance.message }, { status: 503 });
    }

    const challenge = await getCustomerTwoFactorChallenge();
    if (!challenge) {
      return NextResponse.json({ success: false, error: NO_CHALLENGE_ERROR, code: "no_challenge" }, { status: 401 });
    }

    const payload = await request.json().catch(() => ({}));
    const code = String(payload.code || "").trim();
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ success: false, error: "Enter the 6-digit code.", code: "invalid" }, { status: 400 });
    }

    try {
      await verifyCustomerLoginOtp(challenge.customerId, code);
    } catch (error) {
      if (error instanceof LoginOtpError) {
        return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.status });
      }
      throw error;
    }

    const customer = await getCustomerRowById(challenge.customerId);
    await clearCustomerTwoFactorChallenge();
    if (!customer) {
      return NextResponse.json({ success: false, error: "This account no longer exists.", code: "no_user" }, { status: 401 });
    }

    const data = await finalizeCustomerLogin(customer, { rememberMe: challenge.rememberMe });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
