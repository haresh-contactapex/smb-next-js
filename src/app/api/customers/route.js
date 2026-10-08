import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { listCustomers, createCustomerRecord, deleteCustomerRecords } from "@/lib/customers";
import { logAdminActivity } from "@/lib/notifications";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BULK_DELETE = 5000;

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
    await logAdminActivity({
      actor: auth.user,
      action: "customer.created",
      entityType: "customer",
      entityId: id,
      title: `Customer "${String(payload?.name || [payload?.firstName, payload?.lastName].filter(Boolean).join(" ") || payload?.email || "").slice(0, 80) || "untitled"}" created`,
      severity: "success",
    });
    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// Bulk delete: body `{ ids: [customerId, ...] }`.
export async function DELETE(request) {
  const auth = await requireStaffPermission("customers.delete");
  if (!auth.ok) return permissionDeniedResponse(auth);

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const ids = Array.isArray(body?.ids) ? [...new Set(body.ids)] : null;
  if (!ids || ids.length === 0) {
    return NextResponse.json({ success: false, error: "Select at least one customer to delete" }, { status: 400 });
  }
  if (ids.length > MAX_BULK_DELETE || ids.some((id) => typeof id !== "string" || !UUID_PATTERN.test(id))) {
    return NextResponse.json({ success: false, error: "Invalid customer selection" }, { status: 400 });
  }

  try {
    const deleted = await deleteCustomerRecords(ids);
    await logAdminActivity({
      actor: auth.user,
      action: "customer.deleted",
      entityType: "customer",
      entityId: null,
      title: `${deleted} customer${deleted === 1 ? "" : "s"} deleted`,
      severity: "warning",
    });
    return NextResponse.json({ success: true, data: { deleted } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
