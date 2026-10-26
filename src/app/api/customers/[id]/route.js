import { fail, ok, readJsonBody } from "@/lib/api";
import { isUuid } from "@/lib/shared/ids";
import { publicErrorMessage } from "@/lib/publicError";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { getCustomerRecordById, updateCustomerRecord, deleteCustomerRecord } from "@/lib/customers";
import { logAdminActivity } from "@/lib/notifications";

export async function GET(request, { params }) {
  const auth = await requireStaffPermission(["customers.view", "customers.edit"]);
  if (!auth.ok) return permissionDeniedResponse(auth);
  if (!isUuid(params.id)) return fail("Not found", 404);

  try {
    const customer = await getCustomerRecordById(params.id);
    if (!customer) {
      return fail("Not found", 404);
    }
    return ok(customer);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}

export async function PUT(request, { params }) {
  const auth = await requireStaffPermission("customers.edit");
  if (!auth.ok) return permissionDeniedResponse(auth);
  if (!isUuid(params.id)) return fail("Not found", 404);

  try {
    const body = await readJsonBody(request);
    if (body.response) return body.response;
    const payload = body.payload;
    const id = await updateCustomerRecord(params.id, payload);
    await logAdminActivity({
      actor: auth.user,
      action: "customer.updated",
      entityType: "customer",
      entityId: id,
      title: `Customer "${String(payload?.name || [payload?.firstName, payload?.lastName].filter(Boolean).join(" ") || payload?.email || "").slice(0, 80) || "untitled"}" updated`,
    });
    return ok({ id });
  } catch (error) {
    return fail(publicErrorMessage(error), 400);
  }
}

export async function DELETE(request, { params }) {
  const auth = await requireStaffPermission("customers.delete");
  if (!auth.ok) return permissionDeniedResponse(auth);
  if (!isUuid(params.id)) return fail("Not found", 404);

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
    return ok({ id: params.id });
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
