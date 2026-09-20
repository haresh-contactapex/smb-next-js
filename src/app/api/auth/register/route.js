import { NextResponse } from "next/server";
import { findCustomerByEmail, createCustomer } from "@/lib/customers";
import { hashPassword } from "@/lib/auth/password";
import { createCustomerSession } from "@/lib/auth/customerSession";
import { checkRecaptchaIfEnabled } from "@/lib/auth/recaptcha";
import { isValidEmail, isValidPassword } from "@/components/auth/helpers";

export async function POST(request) {
  try {
    const payload = await request.json();
    const firstName = String(payload.firstName || "").trim();
    const lastName = String(payload.lastName || "").trim();
    const email = String(payload.email || "").trim();
    const password = String(payload.password || "");

    if (!firstName || !isValidEmail(email) || !isValidPassword(password)) {
      return NextResponse.json(
        { success: false, error: "Enter your name, a valid email and a password of at least 8 characters." },
        { status: 400 }
      );
    }
    if (!payload.agreeTerms) {
      return NextResponse.json(
        { success: false, error: "You must accept the terms to continue." },
        { status: 400 }
      );
    }

    const recaptcha = await checkRecaptchaIfEnabled(payload.recaptchaToken);
    if (recaptcha.required && !recaptcha.valid) {
      return NextResponse.json(
        { success: false, error: "reCAPTCHA verification failed. Please try again." },
        { status: 400 }
      );
    }

    const existing = await findCustomerByEmail(email);
    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with that email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const customer = await createCustomer({
      firstName,
      lastName,
      email,
      passwordHash,
      acceptsMarketing: false,
      agreedToTerms: true,
    });

    await createCustomerSession(customer.id, { rememberMe: false });

    return NextResponse.json({ success: true, data: customer }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
