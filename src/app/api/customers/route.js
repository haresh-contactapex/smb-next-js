import { fail, ok, readJsonBody } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { listCustomers, createCustomerRecord, deleteCustomerRecords } from "@/lib/customers";
import { readBulkIds } from "@/lib/bulkIds";
import { logAdminActivity } from "@/lib/notifications";

const MAX_BULK_DELETE = 5000;

export async function GET() {
  const auth = await requireStaffPermission("customers.view");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const data = await listCustomers();
    return ok(data);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}

export async function POST(request) {
  const auth = await requireStaffPermission("customers.create");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const body = await readJsonBody(request);
    if (body.response) return body.response;
    const payload = body.payload;
    const id = await createCustomerRecord(payload);
    await logAdminActivity({
      actor: auth.user,
      action: "customer.created",
      entityType: "customer",
      entityId: id,
      title: `Customer "${String(payload?.name || [payload?.firstName, payload?.lastName].filter(Boolean).join(" ") || payload?.email || "").slice(0, 80) || "untitled"}" created`,
      severity: "success",
    });
    return ok({ id }, 201);
  } catch (error) {
    return fail(publicErrorMessage(error), 400);
  }
}

// Bulk delete: body `{ ids: [customerId, ...] }`.
export async function DELETE(request) {
  const auth = await requireStaffPermission("customers.delete");
  if (!auth.ok) return permissionDeniedResponse(auth);

  const { ids, error } = await readBulkIds(request, "customer", "delete", { max: MAX_BULK_DELETE });
  if (error) return fail(error, 400);

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
    return ok({ deleted });
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
