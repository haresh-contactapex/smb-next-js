import { fail, ok, readJsonBody } from "@/lib/api";
import { isUuid } from "@/lib/shared/ids";
import { publicErrorMessage } from "@/lib/publicError";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { getOrderById, getOrderDetails, updateOrderStatus } from "@/lib/orders";
import { logAdminActivity } from "@/lib/notifications";
import { sendOrderStatusEmail } from "@/lib/orderEmails";

// The status changes the customer is emailed about (Settings -> Email -> shipping notification emails).
const STATUS_EMAILS = { Processing: "processing", Completed: "completed", Cancelled: "cancelled" };

export async function GET(request, { params }) {
  const auth = await requireStaffPermission("orders.view");
  if (!auth.ok) return permissionDeniedResponse(auth);
  if (!isUuid(params.id)) return fail("Not found", 404);

  try {
    const order = await getOrderDetails(params.id);
    if (!order) return fail("Order not found.", 404);
    return ok(order);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}

export async function PATCH(request, { params }) {
  const auth = await requireStaffPermission("orders.edit");
  if (!auth.ok) return permissionDeniedResponse(auth);
  if (!isUuid(params.id)) return fail("Not found", 404);

  const parsed = await readJsonBody(request);
  if (parsed.response) return parsed.response;
  const body = parsed.payload;
  try {
    const before = await getOrderById(params.id);
    const order = await updateOrderStatus(params.id, body);
    if (!order) return fail("Order not found.", 404);
    const changes = [];
    if (before?.status !== order.status) changes.push(`status ${before?.status} → ${order.status}`);
    if (before?.payment !== order.payment) changes.push(`payment ${before?.payment} → ${order.payment}`);
    if (changes.length) {
      await logAdminActivity({
        actor: auth.user,
        action: order.status === "Cancelled" && before?.status !== "Cancelled" ? "order.cancelled" : "order.status_changed",
        entityType: "order",
        entityId: params.id,
        title: `Order #${order.orderNumber} updated`,
        description: changes.join(", "),
        severity: order.status === "Cancelled" ? "warning" : "info",
        metadata: { from: { status: before?.status }, to: { status: order.status } },
      });
    }
    if (before?.status !== order.status && STATUS_EMAILS[order.status]) {
      await sendOrderStatusEmail(params.id, STATUS_EMAILS[order.status]);
    }
    return ok(order);
  } catch (error) {
    return fail(publicErrorMessage(error), 400);
  }
}
