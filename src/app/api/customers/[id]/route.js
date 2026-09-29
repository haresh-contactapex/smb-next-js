import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { getCustomerRecordById, updateCustomerRecord, deleteCustomerRecord } from "@/lib/customers";
import { logAdminActivity } from "@/lib/notifications";

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
    await logAdminActivity({
      actor: auth.user,
      action: "customer.updated",
      entityType: "customer",
      entityId: id,
      title: `Customer "${String(payload?.name || [payload?.firstName, payload?.lastName].filter(Boolean).join(" ") || payload?.email || "").slice(0, 80) || "untitled"}" updated`,
    });
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
    await logAdminActivity({
      actor: auth.user,
      action: "customer.deleted",
      entityType: "customer",
      entityId: params.id,
      title: "Customer deleted",
      severity: "warning",
    });
    return NextResponse.json({ success: true, data: { id: params.id } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
