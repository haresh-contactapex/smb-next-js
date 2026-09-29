import OrdersPageToolbar from "@/components/orders/OrdersPageToolbar";
import OrdersStats from "@/components/orders/OrdersStats";
import OrdersListing from "@/components/orders/OrdersListing";
import { listOrders } from "@/lib/orders";
import { computeOrderStats } from "@/components/orders/orderHelpers";

export const metadata = {
  title: "Processing Orders · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

export default async function ProcessingOrdersPage() {
  const orders = await listOrders();
  const stats = computeOrderStats(orders);

  return (
    <>
      <OrdersPageToolbar title="Processing Orders" breadcrumb="Processing" />
      <OrdersStats stats={stats} />
      <OrdersListing orders={orders} fixedStatus="Processing" />
    </>
  );
}
