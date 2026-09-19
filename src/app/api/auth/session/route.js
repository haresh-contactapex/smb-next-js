import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/auth/customerSession";

export async function GET() {
  const customer = await getCurrentCustomer();
  return NextResponse.json({ success: true, data: customer });
}
