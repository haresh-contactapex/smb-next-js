import { NextResponse } from 'next/server';
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { settingsPermission } from "@/lib/permissions";
import { sql } from '@/lib/db';

export async function GET() {
  const auth = await requireStaffPermission(settingsPermission("system-maintenance", "view"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
    return NextResponse.json({ success: true, data: result[0] });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
