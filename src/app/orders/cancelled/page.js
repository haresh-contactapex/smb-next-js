import OrdersPageToolbar from "@/components/orders/OrdersPageToolbar";
import OrdersStats from "@/components/orders/OrdersStats";
import OrdersListing from "@/components/orders/OrdersListing";
import { orders } from "@/data/ordersData";
import { computeOrderStats } from "@/components/orders/orderHelpers";

export const metadata = {
  title: "Cancelled Orders · Shop My Band Admin",
};

export default function CancelledOrdersPage() {
  const stats = computeOrderStats(orders);

  return (
    <>
      <OrdersPageToolbar title="Cancelled Orders" breadcrumb="Cancelled" />
      <OrdersStats stats={stats} />
      <OrdersListing orders={orders} fixedStatus="Cancelled" />
    </>
  );
}
