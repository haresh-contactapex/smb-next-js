import OrdersPageToolbar from "@/components/orders/OrdersPageToolbar";
import OrdersStats from "@/components/orders/OrdersStats";
import OrdersListing from "@/components/orders/OrdersListing";
import { listOrders } from "@/lib/orders";
import { computeOrderStats } from "@/components/orders/orderHelpers";

export const metadata = {
  title: "Completed Orders · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

export default async function CompletedOrdersPage() {
  const orders = await listOrders();
  const stats = computeOrderStats(orders);

  return (
    <>
      <OrdersPageToolbar title="Completed Orders" breadcrumb="Completed" />
      <OrdersStats stats={stats} />
      <OrdersListing orders={orders} fixedStatus="Completed" />
    </>
  );
}
