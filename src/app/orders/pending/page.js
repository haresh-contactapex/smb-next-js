import OrdersPageToolbar from "@/components/orders/OrdersPageToolbar";
import OrdersStats from "@/components/orders/OrdersStats";
import OrdersListing from "@/components/orders/OrdersListing";
import { orders } from "@/data/ordersData";
import { computeOrderStats } from "@/components/orders/orderHelpers";

export const metadata = {
  title: "Pending Orders · Shop My Band Admin",
};

export default function PendingOrdersPage() {
  const stats = computeOrderStats(orders);

  return (
    <>
      <OrdersPageToolbar title="Pending Orders" breadcrumb="Pending" />
      <OrdersStats stats={stats} />
      <OrdersListing orders={orders} fixedStatus="Pending" />
    </>
  );
}
