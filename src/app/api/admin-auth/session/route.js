import { NextResponse } from "next/server";
import { getCurrentStaffUser } from "@/lib/auth/staffSession";

export async function GET() {
  const staffUser = await getCurrentStaffUser();
  return NextResponse.json({ success: true, data: staffUser });
}
