import AccountPageHeader from "@/components/account/AccountPageHeader";
import LoadFailed from "@/components/account/LoadFailed";
import OrdersList from "@/components/account/OrdersList";
import { loadOrNull } from "@/lib/accountError";
import { requireCustomerPage } from "@/lib/auth/customerPage";
import { loadMoneyFormat } from "@/lib/moneyFormat";
import { ORDER_STATUSES, getCustomerOrderCounts, listCustomerOrders } from "@/lib/customerOrders";

export const metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

const first = (value) => (Array.isArray(value) ? value[0] : value);

export default async function OrdersPage({ searchParams }) {
  const params = await searchParams;
  const status = ORDER_STATUSES.includes(first(params?.status)) ? first(params.status) : "";
  const q = String(first(params?.q) || "").trim().slice(0, 40);
  const page = Number.parseInt(first(params?.page), 10) || 1;

  const customer = await requireCustomerPage("/account/orders");
  const [data, counts, moneyFormat] = await Promise.all([
    loadOrNull("orders", () => listCustomerOrders(customer.id, { status, q, page })),
    loadOrNull("order counts", () => getCustomerOrderCounts(customer.id)),
    loadMoneyFormat(),
  ]);

  if (!data) {
    return (
      <>
        <AccountPageHeader title="Orders" description="Track, review and reorder everything you've bought." />
        <LoadFailed what="orders" retryHref="/account/orders" />
      </>
    );
  }

  return <OrdersList data={data} counts={counts || undefined} status={status} q={q} moneyFormat={moneyFormat} />;
}
