import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { cancelOrders } from "@/lib/orders";
import { readBulkIds } from "@/lib/bulkIds";
import { logAdminActivity } from "@/lib/notifications";
import { sendOrderStatusEmail } from "@/lib/orderEmails";

// Bulk cancel from the orders list: body `{ ids: [orderId, ...] }`. Each
// cancelled order is logged and its customer emailed exactly as when one
// order is set to Cancelled (PATCH /api/orders/[id]); orders that aren't
// Pending or Processing are skipped. Returns { cancelled, skipped, paid }.
export async function POST(request) {
  const auth = await requireStaffPermission("orders.cancel");
  if (!auth.ok) return permissionDeniedResponse(auth);

  const { ids, error } = await readBulkIds(request, "order", "cancel");
  if (error) return NextResponse.json({ success: false, error }, { status: 400 });

  try {
    const cancelled = await cancelOrders(ids);
    for (const order of cancelled) {
      await logAdminActivity({
        actor: auth.user,
        action: "order.cancelled",
        entityType: "order",
        entityId: order.id,
        title: `Order #${order.orderNumber} updated`,
        description: "status → Cancelled (bulk cancel)",
        severity: "warning",
        metadata: { to: { status: "Cancelled" }, bulk: true },
      });
      // Queued to run after the response (see orderEmails.js), so many orders don't hold it up.
      await sendOrderStatusEmail(order.id, "cancelled");
    }
    return NextResponse.json({
      success: true,
      data: {
        cancelled: cancelled.length,
        skipped: ids.length - cancelled.length,
        paid: cancelled.filter((order) => order.paymentStatus === "Paid").length,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
