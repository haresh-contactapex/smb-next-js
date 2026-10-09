import { NextResponse } from "next/server";
import { getCustomerTwoFactorChallenge } from "@/lib/auth/customer2faChallenge";
import { checkCustomerOtpRateLimit, issueCustomerLoginOtp } from "@/lib/auth/customerLoginOtp";
import { OTP_TTL_MS } from "@/lib/auth/loginOtp";
import { getCustomerRowById } from "@/lib/customers";
import { sendLoginOtpEmail } from "@/lib/email";
import { checkMaintenanceMode } from "@/lib/systemMaintenanceSettings";

const NO_CHALLENGE_ERROR = "Your sign-in session has expired. Sign in again.";

export async function POST() {
  try {
    const maintenance = await checkMaintenanceMode();
    if (maintenance.active) {
      return NextResponse.json({ success: false, error: maintenance.message }, { status: 503 });
    }

    const challenge = await getCustomerTwoFactorChallenge();
    if (!challenge) {
      return NextResponse.json({ success: false, error: NO_CHALLENGE_ERROR, code: "no_challenge" }, { status: 401 });
    }

    const rateLimit = await checkCustomerOtpRateLimit(challenge.customerId);
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

    const customer = await getCustomerRowById(challenge.customerId);
    if (!customer) {
      return NextResponse.json({ success: false, error: "This account no longer exists.", code: "no_user" }, { status: 401 });
    }

    const { code } = await issueCustomerLoginOtp({ customerId: customer.id, email: customer.email });
    const sent = await sendLoginOtpEmail({
      to: customer.email,
      firstName: customer.first_name,
      code,
      expiresInSeconds: OTP_TTL_MS / 1000,
      audience: "customer",
    });
    if (!sent) {
      return NextResponse.json(
        { success: false, error: "We couldn't send a new code. Please try again shortly." },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: true, data: { expiresInSeconds: OTP_TTL_MS / 1000 } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
