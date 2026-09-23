import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { getCustomerRecordById, updateCustomerRecord, deleteCustomerRecord } from "@/lib/customers";

export async function GET(request, { params }) {
  const auth = await requireStaffPermission(["customers.view", "customers.edit"]);
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const customer = await getCustomerRecordById(params.id);
    if (!customer) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: customer });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const auth = await requireStaffPermission("customers.edit");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const payload = await request.json();
    const id = await updateCustomerRecord(params.id, payload);
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const auth = await requireStaffPermission("customers.delete");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    await deleteCustomerRecord(params.id);
    return NextResponse.json({ success: true, data: { id: params.id } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
