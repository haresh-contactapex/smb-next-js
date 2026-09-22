import { NextResponse } from "next/server";
import { exportProductsToCsv } from "@/lib/productExport";
import { getCurrentStaffUser } from "@/lib/auth/staffSession";

export async function GET() {
  // Middleware only gates page navigation, not /api — this route must check
  // the staff session itself before reading product data out.
  const staffUser = await getCurrentStaffUser();
  if (!staffUser) {
    return NextResponse.json({ success: false, error: "Not signed in." }, { status: 401 });
  }

  try {
    const csv = await exportProductsToCsv();
    const filename = `products-export-${new Date().toISOString().slice(0, 10)}.csv`;
    return NextResponse.json({ success: true, data: { csv, filename } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
