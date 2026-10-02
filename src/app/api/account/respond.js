import { NextResponse } from "next/server";
import { AccountError } from "@/lib/accountError";
import { getCurrentCustomer } from "@/lib/auth/customerSession";

// Shared by every /api/account/* handler. Middleware does not cover /api, so
// each handler starts with requireCustomer() itself.

export const ok = (data) => NextResponse.json({ success: true, data });

// A customer-fixable problem keeps its own status, message and (when it has
// one) the form field at fault; anything else is logged and reported generically.
export function failure(error, fallbackMessage) {
  if (error instanceof AccountError) {
    return NextResponse.json(
      { success: false, error: error.message, ...(error.field ? { field: error.field } : {}) },
      { status: error.status }
    );
  }
  console.error("Account request failed", error);
  return NextResponse.json({ success: false, error: fallbackMessage }, { status: 500 });
}

export async function requireCustomer() {
  const customer = await getCurrentCustomer();
  if (customer) return { customer };
  return {
    response: NextResponse.json({ success: false, error: "Sign in to manage your account." }, { status: 401 }),
  };
}

export const readJson = (request) => request.json().catch(() => ({}));
