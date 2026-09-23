import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { listCustomers, createCustomerRecord } from "@/lib/customers";

export async function GET() {
  const auth = await requireStaffPermission("customers.view");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const data = await listCustomers();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = await requireStaffPermission("customers.create");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const payload = await request.json();
    const id = await createCustomerRecord(payload);
    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
