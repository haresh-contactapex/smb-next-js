import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { exportReportsToCsv } from "@/lib/reportsExport";

export async function GET() {
  const auth = await requireStaffPermission("reports.export");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const csv = await exportReportsToCsv();
    const filename = `reports-export-${new Date().toISOString().slice(0, 10)}.csv`;
    return NextResponse.json({ success: true, data: { csv, filename } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
