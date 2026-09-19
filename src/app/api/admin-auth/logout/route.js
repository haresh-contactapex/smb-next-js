import { NextResponse } from "next/server";
import { clearStaffSession } from "@/lib/auth/staffSession";

export async function POST() {
  await clearStaffSession();
  return NextResponse.json({ success: true });
}
