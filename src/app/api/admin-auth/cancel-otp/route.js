import { NextResponse } from "next/server";
import { clearStaffTwoFactorChallenge } from "@/lib/auth/staff2faChallenge";

// "Use a different account" on the OTP step: drops the pending challenge so
// a stale one isn't left behind when the user goes back to the sign-in form.
export async function POST() {
  await clearStaffTwoFactorChallenge();
  return NextResponse.json({ success: true });
}
