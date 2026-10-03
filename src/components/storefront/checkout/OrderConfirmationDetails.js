"use client";

import StoreIcon from "../icons";
import { CHECKOUT_CARD } from "./checkoutStyles";
import { LineImage, Row } from "./OrderSummaryParts";
import { addressLines, formatDate, pluralize } from "@/components/account/accountHelpers";
import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";

// The soft orange circle every detail's icon sits in. Decorative: the text beside it says what it is.
function IconBadge({ name }) {
  return (
    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#FEF1DD] text-[#EF9822]">
      <StoreIcon name={name} className="h-[18px] w-[18px]" />
    </span>
  );
}

// One line of a card: an icon and its text. `label` is only for screen readers, since the
// icon alone doesn't say whether a line is an email or a phone number.
function InfoRow({ icon, label, children, strong = false }) {
  return (
    <div className="flex items-start gap-3">
      <IconBadge name={icon} />
      <div className={`min-w-0 flex-1 self-center break-words ${strong ? "font-semibold text-[#222222]" : ""}`}>
        <span className="sr-only">{label}: </span>
        {children}
      </div>
    </div>
  );
}

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

// Whether two saved addresses say the same thing. The checkout saves a billing row and a
// shipping row even when the customer ticked "same as billing", so this compares what they
// say (ignoring case and stray spaces) rather than whether it is one record. Two missing
// addresses are not "the same": there is nothing to show.
const ADDRESS_FIELDS = ["fullName", "company", "line1", "line2", "city", "state", "zip", "country", "phone"];

function sameAddress(first, second) {
  if (!first || !second) return false;
  const normal = (value) => String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  return ADDRESS_FIELDS.every((field) => normal(first[field]) === normal(second[field]));
}

// `note` is an optional line under the title, used when this one card stands for both addresses.
function AddressCard({ id, title, address, note }) {
  return (
    <Card id={id} title={title} className="!p-6">
      {note && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-[#FCF9F3] px-3 py-2 text-[14px] text-[#555555]">
          <StoreIcon name="check" className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#EF9822] [stroke-width:2.5]" />
          {note}
        </p>
      )}
      {address ? (
        <address className="mt-4 space-y-3 text-[15px] not-italic leading-relaxed text-[#555555]">
          <InfoRow icon="user" label="Name" strong>
            {address.fullName}
            {address.company && <span className="block font-normal text-[#555555]">{address.company}</span>}
          </InfoRow>
          <InfoRow icon="mapPin" label="Address">
            {addressLines(address).map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </InfoRow>
          {address.phone && (
            <InfoRow icon="phone" label="Phone">
              {address.phone}
            </InfoRow>
          )}
        </address>
      ) : (
        <p className="mt-3 text-[15px] text-[#777777]">Not recorded for this order.</p>
      )}
    </Card>
  );
}

function Fact({ icon, label, children }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <IconBadge name={icon} />
      <div className="min-w-0">
        <dt className="text-[13px] text-[#777777]">{label}</dt>
        <dd className="mt-0.5 break-words text-[16px] font-semibold text-[#222222]">{children}</dd>
      </div>
    </div>
  );
}

// Everything about a placed order, shown on its confirmation page: the key facts, each
// item, the price breakdown, who it's for, where it goes and how it was paid. Every fact
// and contact line carries an icon so the page can be scanned at a glance.
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
      <dl className={`${CHECKOUT_CARD} grid grid-cols-1 gap-x-6 gap-y-5 bg-[#FCF9F3] p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-4`}>
        <Fact icon="hashtag" label="Order number">
          #{orderNumber}
        </Fact>
        <Fact icon="calendar" label="Date placed">
          {formatDate(details.placedAt)}
        </Fact>
        <Fact icon="tag" label="Total">
          {money(total)}
        </Fact>
        {details.paymentMethod && (
          <Fact icon="creditCard" label="Payment method">
            {details.paymentMethod}
          </Fact>
        )}
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
            <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-[#555555]">
              <InfoRow icon="user" label="Name" strong>
                {customer.name}
              </InfoRow>
              {customer.email && (
                <InfoRow icon="mail" label="Email">
                  <span className="break-all">{customer.email}</span>
                </InfoRow>
              )}
              {customer.phone && (
                <InfoRow icon="phone" label="Phone">
                  {customer.phone}
                </InfoRow>
              )}
            </div>
          </Card>
          {sameAddress(details.shippingAddress, details.billingAddress) ? (
            <AddressCard
              id="confirmation-address-title"
              title="Shipping & billing address"
              address={details.shippingAddress}
              note="Your billing address is the same as your shipping address."
            />
          ) : (
            <>
              <AddressCard id="confirmation-shipping-title" title="Shipping address" address={details.shippingAddress} />
              <AddressCard id="confirmation-billing-title" title="Billing address" address={details.billingAddress} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
