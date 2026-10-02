import { notFound } from "next/navigation";
import LoadFailed from "@/components/account/LoadFailed";
import OrderDetailView from "@/components/account/OrderDetailView";
import { requireCustomerPage } from "@/lib/auth/customerPage";
import { getCustomerOrder } from "@/lib/customerOrders";

export const metadata = { title: "Order details" };
export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }) {
  const { orderNumber } = await params;
  const href = `/account/orders/${encodeURIComponent(orderNumber)}`;
  const customer = await requireCustomerPage(href);

  // A failed read and "no such order" are different answers: the first offers a
  // retry, the second is a 404 (also what another customer's order number gets).
  let order;
  try {
    order = await getCustomerOrder(customer.id, orderNumber);
  } catch (error) {
    console.error("Account order failed to load", error);
    return <LoadFailed what="order" retryHref={href} />;
  }
  if (!order) notFound();

  return <OrderDetailView order={order} />;
}
