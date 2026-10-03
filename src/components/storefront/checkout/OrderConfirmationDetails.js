"use client";

import { CHECKOUT_CARD } from "./checkoutStyles";
import { LineImage, Row } from "./OrderSummaryParts";
import { addressLines, formatDate, pluralize } from "@/components/account/accountHelpers";
import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";

function Card({ id, title, className = "", children }) {
  return (
    <section aria-labelledby={id} className={`${CHECKOUT_CARD} p-6 sm:p-8 ${className}`}>
      <h2 id={id} className="text-[20px] font-bold text-[#111111]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function AddressCard({ id, title, address }) {
  return (
    <Card id={id} title={title} className="!p-6">
      {address ? (
        <address className="mt-3 text-[15px] not-italic leading-relaxed text-[#555555]">
          <span className="block font-semibold text-[#222222]">{address.fullName}</span>
          {address.company && <span className="block">{address.company}</span>}
          {addressLines(address).map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
          {address.phone && <span className="mt-1 block">{address.phone}</span>}
        </address>
      ) : (
        <p className="mt-3 text-[15px] text-[#777777]">Not recorded for this order.</p>
      )}
    </Card>
  );
}

function Fact({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-[13px] text-[#777777]">{label}</dt>
      <dd className="mt-1 break-words text-[16px] font-semibold text-[#222222]">{children}</dd>
    </div>
  );
}

// Everything about a placed order, shown on its confirmation page: the key facts, each
// item, the price breakdown, who it's for, where it goes and how it was paid.
// `details` is getOrderConfirmation() plus `paymentMethod` (see resolveCheckoutResult).
// An order saved without its detail rows still shows the facts and totals it has.
export default function OrderConfirmationDetails({ orderNumber, total, currency, details }) {
  const { formatMoney } = useGeneralSettings();
  const money = (amount) => formatMoney(amount, currency || undefined);
  const { items, amounts, customer } = details;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const hasTax = amounts.taxMode !== "unknown";

  return (
    <div className="mt-10 w-full space-y-6 text-left">
      <dl className={`${CHECKOUT_CARD} grid grid-cols-2 gap-x-6 gap-y-5 bg-[#FCF9F3] p-6 sm:grid-cols-4 sm:p-8`}>
        <Fact label="Order number">#{orderNumber}</Fact>
        <Fact label="Date placed">{formatDate(details.placedAt)}</Fact>
        <Fact label="Total">{money(total)}</Fact>
        {details.paymentMethod && <Fact label="Payment method">{details.paymentMethod}</Fact>}
      </dl>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card id="confirmation-items-title" title={`Items (${itemCount || items.length})`}>
          {items.length > 0 ? (
            <ul className="mt-6 space-y-5">
              {items.map((item) => (
                <li key={item.id} className="flex items-start gap-4">
                  <LineImage src={item.image} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-semibold leading-snug text-[#222222]">{item.title}</p>
                    {item.sku && <p className="mt-1 text-[14px] text-[#777777]">SKU {item.sku}</p>}
                    <p className="mt-1.5 text-[14px] text-[#777777]">
                      Qty: {item.quantity} × {money(item.unitPrice)}
                    </p>
                  </div>
                  <p className="flex-shrink-0 text-[16px] font-semibold text-[#222222]">{money(item.lineTotal)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-[15px] text-[#777777]">The individual items for this order aren&apos;t available to show here.</p>
          )}

          <hr className="my-6 border-[#EEEEEE]" />
          <dl className="space-y-4">
            {amounts.subtotal !== null && <Row label={`Subtotal (${pluralize(itemCount || items.length, "item")})`}>{money(amounts.subtotal)}</Row>}
            {amounts.discount > 0 && (
              <Row label={amounts.couponCode ? `Discount (${amounts.couponCode})` : "Discount"}>
                <span className="text-success">−{money(amounts.discount)}</span>
              </Row>
            )}
            {amounts.shipping !== null && (
              <Row label="Shipping">{amounts.shipping === 0 ? <span className="uppercase">Free</span> : money(amounts.shipping)}</Row>
            )}
            {hasTax && (
              <Row label={amounts.taxRate ? `Tax (${amounts.taxRate}%)` : "Tax"}>{amounts.taxMode === "included" ? "Included" : money(amounts.tax)}</Row>
            )}
          </dl>
          <div className="mt-6 flex items-baseline justify-between gap-4 border-t border-[#EEEEEE] pt-6">
            <span className="text-[22px] font-bold text-[#111111]">Total</span>
            <span className="text-[24px] font-bold text-[#111111]">{money(total)}</span>
          </div>
        </Card>

        <div className="space-y-6">
          <Card id="confirmation-contact-title" title="Contact" className="!p-6">
            <div className="mt-3 text-[15px] leading-relaxed text-[#555555]">
              <p className="font-semibold text-[#222222]">{customer.name}</p>
              {customer.email && <p className="break-all">{customer.email}</p>}
              {customer.phone && <p>{customer.phone}</p>}
            </div>
          </Card>
          <AddressCard id="confirmation-shipping-title" title="Shipping address" address={details.shippingAddress} />
          <AddressCard id="confirmation-billing-title" title="Billing address" address={details.billingAddress} />
        </div>
      </div>
    </div>
  );
}
