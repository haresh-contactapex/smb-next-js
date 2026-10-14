import { NextResponse } from "next/server";
import { endCustomerSession } from "@/lib/auth/customerSession";

export async function POST() {
  await endCustomerSession();
  return NextResponse.json({ success: true });
}
