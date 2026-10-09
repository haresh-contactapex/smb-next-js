import { NextResponse } from "next/server";
import { clearCustomerTwoFactorChallenge } from "@/lib/auth/customer2faChallenge";

// "Use a different account" on the code step: drops the pending challenge so a
// stale one isn't left behind when the customer goes back to the sign-in form.
export async function POST() {
  await clearCustomerTwoFactorChallenge();
  return NextResponse.json({ success: true });
}
