import Link from "next/link";
import StoreIcon from "../storefront/icons";
import AccountPageHeader from "./AccountPageHeader";
import OrderActions from "./OrderActions";
import OrderTimeline from "./OrderTimeline";
import { OrderStatusBadge, PaymentStatusBadge } from "./StatusBadge";
import { CARD } from "./accountStyles";
import { PAYMENT_PROVIDER_LABELS, addressLines, formatDate, pluralize } from "./accountHelpers";
import { formatCurrency } from "@/lib/currency";

function Panel({ title, children }) {
  return (
    <section className={`${CARD} p-5`}>
      <h2 className="text-[15px] font-semibold text-[#333333]">{title}</h2>
      <div className="mt-3 text-[14px] text-[#555555]">{children}</div>
    </section>
  );
}

function AddressPanel({ title, address }) {
  return (
    <Panel title={title}>
      {address ? (
        <address className="not-italic leading-relaxed">
          <span className="font-semibold text-[#333333]">{address.fullName}</span>
          {address.company && <span className="block">{address.company}</span>}
          {addressLines(address).map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
          {address.phone && <span className="mt-1 block text-gray-500">{address.phone}</span>}
        </address>
      ) : (
        <p className="text-gray-500">Not recorded for this order.</p>
      )}
    </Panel>
  );
}

// One order in full: progress, items, totals, the addresses it used and its payments.
// `order` is getCustomerOrder()'s result. The line items, addresses and payments
// come from tables a store may not have yet, so each part tolerates being empty.
export default function OrderDetailView({ order }) {
  const hasItems = order.items.length > 0;
  const money = (amount) => formatCurrency(amount, order.currency);
  const stillOpen = order.status === "Pending" || order.status === "Processing";

  return (
    <>
      <Link href="/account/orders" className="mb-4 inline-flex items-center gap-1.5 text-[14px] font-medium text-gray-500 transition-colors hover:text-[#ef9822]">
        <StoreIcon name="chevronLeft" className="h-4 w-4" />
        All orders
      </Link>

      <AccountPageHeader title={`Order #${order.orderNumber}`} description={`Placed on ${formatDate(order.placedAt)}`}>
        <OrderStatusBadge status={order.status} />
        <PaymentStatusBadge status={order.paymentStatus} />
      </AccountPageHeader>

      <div className="mb-6">
        <OrderActions orderNumber={order.orderNumber} canCancel={order.canCancel} hasItems={hasItems} />
        {stillOpen && !order.canCancel && (
          <p className="mt-3 text-[13.5px] text-gray-500">
            Need to change or cancel this order? It&apos;s already been paid for or is being prepared, so please contact us and quote order{" "}
            <span className="font-semibold text-[#333333]">#{order.orderNumber}</span>.
          </p>
        )}
      </div>

      <div className="mb-6">
        <OrderTimeline order={order} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="order-items-title" className={`${CARD} p-5 sm:p-6`}>
          <h2 id="order-items-title" className="text-[17px] font-semibold text-[#333333]">
            Items <span className="font-normal text-gray-500">({pluralize(order.itemCount || order.items.length, "item")})</span>
          </h2>

          {hasItems ? (
            <ul className="mt-4 divide-y divide-gray-100">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                  <span className="grid h-[72px] w-[72px] flex-shrink-0 place-items-center overflow-hidden rounded-lg bg-[#FAFAFA]">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt="" className="h-full w-full object-contain p-2 mix-blend-multiply" />
                    ) : (
                      <StoreIcon name="box" className="h-6 w-6 text-gray-300" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold leading-snug text-[#333333]">
                      {item.handle ? (
                        <Link href={`/products/${item.handle}`} className="transition-colors hover:text-[#ef9822]">
                          {item.title}
                        </Link>
                      ) : (
                        item.title
                      )}
                    </p>
                    {item.sku && <p className="mt-0.5 text-[12.5px] text-gray-400">SKU {item.sku}</p>}
                    <p className="mt-1 text-[13.5px] text-gray-500">
                      Qty {item.quantity} × {money(item.unitPrice)}
                    </p>
                  </div>
                  <p className="flex-shrink-0 text-[15px] font-semibold text-[#333333]">{money(item.lineTotal)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[14px] text-gray-500">The individual items for this order aren&apos;t available to show here.</p>
          )}
        </section>

        <div className="flex flex-col gap-6">
          <Panel title="Order summary">
            <dl className="space-y-2">
              {hasItems && (
                <div className="flex justify-between gap-4">
                  <dt>Items subtotal</dt>
                  <dd className="text-[#333333]">{money(order.itemsSubtotal)}</dd>
                </div>
              )}
              {hasItems && order.adjustments !== 0 && (
                <div className="flex justify-between gap-4">
                  <dt>Shipping, tax &amp; discounts</dt>
                  <dd className="text-[#333333]">{money(order.adjustments)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4 border-t border-gray-100 pt-3 text-[16px] font-semibold text-[#333333]">
                <dt>Total</dt>
                <dd>{money(order.total)}</dd>
              </div>
            </dl>
          </Panel>

          <AddressPanel title="Shipping address" address={order.shippingAddress} />
          <AddressPanel title="Billing address" address={order.billingAddress} />

          <Panel title="Payment">
            {order.payments.length > 0 ? (
              <ul className="space-y-3">
                {order.payments.map((payment, index) => (
                  <li key={`${payment.createdAt}-${index}`} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#333333]">{PAYMENT_PROVIDER_LABELS[payment.provider] || payment.provider}</p>
                      <p className="text-[12.5px] capitalize text-gray-500">
                        {payment.status}
                        {payment.reference ? ` · ref ${payment.reference}` : ""} · {formatDate(payment.createdAt)}
                      </p>
                    </div>
                    <p className="flex-shrink-0 font-semibold text-[#333333]">{money(payment.amount)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                Payment status: <PaymentStatusBadge status={order.paymentStatus} />
              </p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
