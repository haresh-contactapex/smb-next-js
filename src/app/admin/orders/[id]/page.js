import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/admin-panel/Icon";
import { BADGE_COLOR_CLASSES } from "@/components/dashboard/colorClasses";
import {
  AddressCard,
  CustomerCard,
  OrderItemsCard,
  OrderNoteCard,
  OrderSummaryCard,
  PaymentsCard,
} from "@/components/orders/OrderDetailsSections";
import OrderTimelineCard from "@/components/orders/OrderTimelineCard";
import ViewOrderActions from "@/components/orders/ViewOrderActions";
import { getOrderDetails } from "@/lib/orders";

export const metadata = {
  title: "Order details · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

const BADGE = "inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold";

// One order in full, read-only: progress, products, price and tax, the customer,
// the addresses it used and its payments. The same information the customer sees
// on their own order page, plus who the customer is. Editing happens on the Edit
// Order page, which this links to.
export default async function ViewOrderPage({ params }) {
  const { id } = await params;
  const order = await getOrderDetails(id);
  if (!order) notFound();

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-1"
          >
            <Icon name="chevron-left" className="w-4 h-4" />
            Orders
          </Link>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-white">Order {order.id}</h1>
            <span className={`${BADGE} ${BADGE_COLOR_CLASSES[order.statusColor]}`}>{order.status}</span>
            <span className={`${BADGE} ${BADGE_COLOR_CLASSES[order.paymentColor]}`}>{order.payment}</span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Placed on {order.date}</p>
        </div>
        <ViewOrderActions orderId={order.orderId} orderNumber={order.orderNumber} />
      </div>

      <OrderTimelineCard order={order} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] items-start">
        <div className="space-y-6">
          <OrderItemsCard items={order.items} />
          <OrderNoteCard note={order.note} />
        </div>

        <div className="space-y-6">
          <OrderSummaryCard pricing={order.pricing} />
          <CustomerCard customer={order.customerDetails} />
          <AddressCard title="Shipping address" icon="truck" address={order.shippingAddress} />
          <AddressCard title="Billing address" icon="file-text" address={order.billingAddress} />
          <PaymentsCard payments={order.payments} />
        </div>
      </div>
    </>
  );
}
