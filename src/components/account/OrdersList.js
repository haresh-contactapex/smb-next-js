import Link from "next/link";
import StoreIcon from "../storefront/icons";
import AccountPageHeader from "./AccountPageHeader";
import CancelOrderButton from "./CancelOrderButton";
import OrderThumbs from "./OrderThumbs";
import { OrderStatusBadge, PaymentStatusBadge } from "./StatusBadge";
import { BTN_DANGER, BTN_DARK, BTN_OUTLINE, CARD, FIELD } from "./accountStyles";
import { formatDate, ordersHref, pluralize } from "./accountHelpers";
import { formatCurrency } from "@/lib/currency";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "Pending", label: "Pending" },
  { id: "Processing", label: "Processing" },
  { id: "Completed", label: "Completed" },
  { id: "Cancelled", label: "Cancelled" },
];

// The order history: status tabs with counts, an order-number search, one card
// per order and previous/next paging. All of it is plain links and a GET form,
// so filtering is a normal navigation and works before the page's JavaScript loads.
// `data` is listCustomerOrders()'s result, `counts` getCustomerOrderCounts()'s.
export default function OrdersList({ data, counts, status, q, moneyFormat }) {
  const { orders, total, page, pageCount, pageSize } = data;
  const activeFilter = status || "all";
  const filtered = activeFilter !== "all" || Boolean(q);

  return (
    <>
      <AccountPageHeader title="Orders" description="Track, review and reorder everything you've bought." />

      <div className="mb-5 flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <nav aria-label="Filter orders by status" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ul className="flex gap-2">
            {FILTERS.map((filter) => {
              const active = activeFilter === filter.id;
              const count = counts?.[filter.id];
              return (
                <li key={filter.id} className="flex-shrink-0">
                  <Link
                    href={ordersHref({ status: filter.id, q })}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-medium transition-colors ${
                      active ? "bg-[#4A4A4A] text-white" : "bg-white text-[#555555] ring-1 ring-inset ring-gray-200 hover:text-[#ef9822]"
                    }`}
                  >
                    {filter.label}
                    {count !== undefined && (
                      <span className={`rounded-full px-1.5 text-[12px] ${active ? "bg-white/20" : "bg-gray-100 text-gray-500"}`}>{count}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <form action="/account/orders" method="get" role="search" className="flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <label htmlFor="order-search" className="sr-only">
            Search by order number
          </label>
          <div className="relative min-w-0 flex-1 2xl:w-64 2xl:flex-none">
            <StoreIcon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input id="order-search" name="q" type="search" defaultValue={q} placeholder="Search order number" maxLength={40} className={`${FIELD} !py-2.5 !pl-10 !text-[14px]`} />
          </div>
          <button type="submit" className={`${BTN_OUTLINE} flex-shrink-0`}>
            Search
          </button>
        </form>
      </div>

      {orders.length === 0 ? (
        <div className={`${CARD} flex flex-col items-center gap-3 px-6 py-14 text-center`}>
          <StoreIcon name="box" className="h-12 w-12 text-gray-300" />
          {filtered ? (
            <>
              <p className="text-[16px] font-semibold text-[#333333]">No orders match</p>
              <p className="max-w-sm text-[14px] text-gray-500">Try a different status or a shorter search.</p>
              <Link href="/account/orders" className={`${BTN_OUTLINE} mt-2`}>
                Clear filters
              </Link>
            </>
          ) : (
            <>
              <p className="text-[16px] font-semibold text-[#333333]">You haven&apos;t placed an order yet</p>
              <p className="max-w-sm text-[14px] text-gray-500">When you do, it will show up here so you can follow it.</p>
              <Link href="/women-wedding-bands" className={`${BTN_DARK} mt-2`}>
                Start shopping
              </Link>
            </>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {orders.map((order) => (
            <li key={order.id} className={`${CARD} flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5`}>
              <OrderThumbs preview={order.preview || []} itemCount={order.itemCount} />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <h2 className="text-[16px] font-semibold text-[#333333]">
                    <Link href={`/account/orders/${encodeURIComponent(order.orderNumber)}`} className="transition-colors hover:text-[#ef9822]">
                      Order #{order.orderNumber}
                    </Link>
                  </h2>
                  <OrderStatusBadge status={order.status} />
                  <PaymentStatusBadge status={order.paymentStatus} />
                </div>
                <p className="mt-1 text-[13.5px] text-gray-500">
                  Placed {formatDate(order.placedAt)} · {pluralize(order.itemCount, "item")}
                </p>
              </div>

              <p className="text-[17px] font-semibold text-[#333333] sm:w-36 sm:flex-shrink-0 sm:text-center">{formatCurrency(order.total, order.currency, moneyFormat)}</p>

              <div className="flex items-center justify-between gap-3 sm:w-36 sm:flex-shrink-0 sm:flex-col sm:items-end sm:justify-center sm:gap-2">
                <Link
                  href={`/account/orders/${encodeURIComponent(order.orderNumber)}`}
                  aria-label={`View details of order ${order.orderNumber}`}
                  className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#333333] transition-colors hover:text-[#ef9822]"
                >
                  View details
                  <StoreIcon name="arrowRight" className="h-4 w-4" />
                </Link>
                {order.canCancel && (
                  <CancelOrderButton
                    orderNumber={order.orderNumber}
                    awaitingRefund={order.paymentStatus === "Paid"}
                    className={`${BTN_DANGER} !px-3.5 !py-1.5 !text-[13px]`}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <nav aria-label="Orders pages" className="mt-6 flex items-center justify-between gap-4 text-[14px] text-gray-500">
          <p>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={ordersHref({ status, q, page: page - 1 })} rel="prev" className={BTN_OUTLINE}>
                Previous
              </Link>
            )}
            {page < pageCount && (
              <Link href={ordersHref({ status, q, page: page + 1 })} rel="next" className={BTN_OUTLINE}>
                Next
              </Link>
            )}
          </div>
        </nav>
      )}
    </>
  );
}
