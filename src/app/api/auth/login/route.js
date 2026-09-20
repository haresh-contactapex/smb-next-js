import { NextResponse } from "next/server";
import { findCustomerByEmail, toPublicCustomer } from "@/lib/customers";
import { verifyPassword } from "@/lib/auth/password";
import { createCustomerSession } from "@/lib/auth/customerSession";
import { checkRecaptchaIfEnabled } from "@/lib/auth/recaptcha";
import { isValidEmail } from "@/components/auth/helpers";

const INVALID_CREDENTIALS_ERROR = "Incorrect email or password.";

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

    const customer = await findCustomerByEmail(email);
    const passwordMatches = customer && (await verifyPassword(password, customer.password_hash));
    if (!passwordMatches) {
      return NextResponse.json({ success: false, error: INVALID_CREDENTIALS_ERROR }, { status: 401 });
    }

    await createCustomerSession(customer.id, { rememberMe: Boolean(payload.rememberMe) });

    return NextResponse.json({ success: true, data: toPublicCustomer(customer) });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
