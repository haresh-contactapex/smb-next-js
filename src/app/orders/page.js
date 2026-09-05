import OrdersPageToolbar from "@/components/orders/OrdersPageToolbar";
import OrdersStats from "@/components/orders/OrdersStats";
import OrdersListing from "@/components/orders/OrdersListing";
import { orders } from "@/data/ordersData";
import { computeOrderStats } from "@/components/orders/orderHelpers";

export const metadata = {
  title: "All Orders · Shop My Band Admin",
};

export default function OrdersPage() {
  const stats = computeOrderStats(orders);

  return (
    <>
      <OrdersPageToolbar title="All Orders" breadcrumb="All Orders" />
      <OrdersStats stats={stats} />
      <OrdersListing orders={orders} />
    </>
  );
}
