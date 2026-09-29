import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { getOrderById, updateOrderStatus } from "@/lib/orders";
import { logAdminActivity } from "@/lib/notifications";

export async function GET(request, { params }) {
  const auth = await requireStaffPermission("orders.view");
  if (!auth.ok) return permissionDeniedResponse(auth);

  const order = await getOrderById(params.id);
  if (!order) return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
  return NextResponse.json({ success: true, data: order });
}

export async function PATCH(request, { params }) {
  const auth = await requireStaffPermission("orders.edit");
  if (!auth.ok) return permissionDeniedResponse(auth);

  const body = await request.json();
  try {
    const before = await getOrderById(params.id);
    const order = await updateOrderStatus(params.id, body);
    if (!order) return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
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
    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
