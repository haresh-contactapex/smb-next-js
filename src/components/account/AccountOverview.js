import Link from "next/link";
import StoreIcon from "../storefront/icons";
import CardTile from "./CardTile";
import OrderThumbs from "./OrderThumbs";
import { OrderStatusBadge } from "./StatusBadge";
import { CARD, HEADING_FONT, TEXT_LINK } from "./accountStyles";
import { addressLines, fullNameOf, formatDate, formatMonthYear, pluralize, tierLabel } from "./accountHelpers";
import { CARD_BRAND_LABELS } from "./cardHelpers";
import { formatCurrency } from "@/lib/currency";

// A stat tile that links to its section. `value` is null when that part
// couldn't be loaded, shown as a dash rather than a misleading 0.
function StatTile({ href, icon, label, value, hint }) {
  return (
    <Link href={href} className={`${CARD} group flex items-center gap-4 p-5 transition-shadow hover:shadow-[0_6px_28px_rgba(0,0,0,0.09)]`}>
      <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-[#FAFAFA] text-[#555555] transition-colors group-hover:bg-[#ef9822]/15 group-hover:text-[#ef9822]">
        <StoreIcon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[24px] font-semibold leading-none text-[#333333]">{value ?? "—"}</span>
        <span className="mt-1 block text-[13px] text-gray-500">{label}</span>
        {hint && <span className="block text-[12px] text-gray-400">{hint}</span>}
      </span>
    </Link>
  );
}

function SectionHeading({ id, title, href, linkLabel }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h2 id={id} className="text-[18px] font-semibold text-[#333333]">
        {title}
      </h2>
      {href && (
        <Link href={href} className="text-[13.5px] font-semibold text-[#333333] transition-colors hover:text-[#ef9822]">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

// Anything that failed to load is null (see the page); the section then says so
// instead of showing an empty state that would be wrong.
function Unavailable({ what }) {
  return <p className="rounded-lg bg-[#FAFAFA] px-4 py-3 text-[14px] text-gray-500">We couldn&apos;t load your {what} right now. Please refresh the page to try again.</p>;
}

// The account landing page: a greeting, how much is in each section, the latest
// orders, the default address and card, and a nudge for anything not set up yet.
export default function AccountOverview({ customer, counts, recentOrders, wishlistCount, addresses, paymentMethods, moneyFormat }) {
  const inProgress = counts ? counts.Pending + counts.Processing : null;
  const defaultShipping = addresses?.find((address) => address.isDefaultShipping) || null;
  const defaultCard = paymentMethods?.find((card) => card.isDefault) || null;

  // Only things we know are missing: a failed load is not "missing".
  const todo = [];
  if (!customer.phone) todo.push({ id: "phone", text: "Add a phone number so we can reach you about deliveries", href: "/account/profile", cta: "Add phone" });
  if (addresses && addresses.length === 0) todo.push({ id: "address", text: "Save a delivery address for faster checkout", href: "/account/addresses", cta: "Add address" });
  if (paymentMethods && paymentMethods.length === 0) todo.push({ id: "card", text: "Save a payment method to keep your options in one place", href: "/account/payment-methods", cta: "Add card" });

  return (
    <div className="flex flex-col gap-8">
      <section aria-label="Welcome" className={`${CARD} flex flex-wrap items-center justify-between gap-5 p-6 sm:p-8`}>
        <div className="min-w-0">
          <h1 className="text-[28px] font-normal leading-tight text-[#333333] sm:text-[34px]" style={HEADING_FONT}>
            Welcome back, {customer.firstName}
          </h1>
          <p className="mt-1.5 text-[14.5px] text-gray-500">
            {tierLabel(customer.customerGroup)}
            {customer.createdAt ? ` since ${formatMonthYear(customer.createdAt)}` : ""} · {fullNameOf(customer)}
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-[#FAFAFA] px-5 py-3.5">
          <StoreIcon name="gift" className="h-6 w-6 text-[#ef9822]" />
          <div>
            <p className="text-[22px] font-semibold leading-none text-[#333333]">{customer.loyaltyPoints.toLocaleString("en-US")}</p>
            <p className="mt-0.5 text-[12px] text-gray-500">loyalty points</p>
          </div>
        </div>
      </section>

      <section aria-label="At a glance" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          href="/account/orders"
          icon="box"
          label={counts?.all === 1 ? "Order" : "Orders"}
          value={counts?.all}
          hint={inProgress ? `${inProgress} in progress` : undefined}
        />
        <StatTile href="/account/wishlist" icon="heart" label="Wishlist items" value={wishlistCount} />
        <StatTile href="/account/addresses" icon="mapPin" label={addresses?.length === 1 ? "Saved address" : "Saved addresses"} value={addresses?.length} />
        <StatTile href="/account/payment-methods" icon="creditCard" label={paymentMethods?.length === 1 ? "Saved card" : "Saved cards"} value={paymentMethods?.length} />
      </section>

      {todo.length > 0 && (
        <section aria-labelledby="todo-title" className="rounded-2xl border border-[#ef9822]/40 bg-[#ef9822]/[0.06] p-5 sm:p-6">
          <h2 id="todo-title" className="text-[16px] font-semibold text-[#333333]">
            Finish setting up your account
          </h2>
          <ul className="mt-3 divide-y divide-[#ef9822]/20">
            {todo.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="text-[14px] text-[#555555]">{item.text}</span>
                <Link href={item.href} className={`text-[13.5px] ${TEXT_LINK}`}>
                  {item.cta}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="recent-title">
        <SectionHeading id="recent-title" title="Recent orders" href="/account/orders" linkLabel="View all orders" />
        {recentOrders === null ? (
          <Unavailable what="orders" />
        ) : recentOrders.orders.length === 0 ? (
          <div className={`${CARD} flex flex-col items-center gap-2 px-6 py-10 text-center`}>
            <p className="text-[15px] font-semibold text-[#333333]">No orders yet</p>
            <p className="text-[14px] text-gray-500">
              Once you place an order it will appear here.{" "}
              <Link href="/women-wedding-bands" className={TEXT_LINK}>
                Start shopping
              </Link>
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {recentOrders.orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${encodeURIComponent(order.orderNumber)}`}
                  className={`${CARD} flex items-center gap-4 p-4 transition-shadow hover:shadow-[0_6px_28px_rgba(0,0,0,0.09)]`}
                >
                  <OrderThumbs preview={order.preview || []} itemCount={order.itemCount} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-[15px] font-semibold text-[#333333]">Order #{order.orderNumber}</span>
                      <OrderStatusBadge status={order.status} />
                    </span>
                    <span className="mt-0.5 block text-[13px] text-gray-500">
                      {formatDate(order.placedAt)} · {pluralize(order.itemCount, "item")}
                    </span>
                  </span>
                  <span className="flex-shrink-0 text-[15px] font-semibold text-[#333333]">{formatCurrency(order.total, order.currency, moneyFormat)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="default-address-title">
          <SectionHeading id="default-address-title" title="Default shipping address" href="/account/addresses" linkLabel="Manage" />
          {addresses === null ? (
            <Unavailable what="addresses" />
          ) : defaultShipping ? (
            <div className={`${CARD} p-5`}>
              <address className="text-[14px] not-italic leading-relaxed text-[#555555]">
                <span className="font-semibold text-[#333333]">{defaultShipping.fullName}</span>
                {addressLines(defaultShipping).map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
            </div>
          ) : (
            <div className={`${CARD} p-5 text-[14px] text-gray-500`}>
              You haven&apos;t saved an address yet.{" "}
              <Link href="/account/addresses" className={TEXT_LINK}>
                Add one
              </Link>
            </div>
          )}
        </section>

        <section aria-labelledby="default-card-title">
          <SectionHeading id="default-card-title" title="Default payment method" href="/account/payment-methods" linkLabel="Manage" />
          {paymentMethods === null ? (
            <Unavailable what="saved cards" />
          ) : defaultCard ? (
            <div className={`${CARD} flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center`}>
              <div className="w-full max-w-[240px] flex-shrink-0">
                <CardTile card={defaultCard} />
              </div>
              <p className="text-[14px] text-[#555555]">
                <span className="font-semibold text-[#333333]">
                  {CARD_BRAND_LABELS[defaultCard.brand]} ending in {defaultCard.last4}
                </span>
                {defaultCard.expired && <span className="block text-red-600">This card has expired</span>}
              </p>
            </div>
          ) : (
            <div className={`${CARD} p-5 text-[14px] text-gray-500`}>
              You haven&apos;t saved a card yet.{" "}
              <Link href="/account/payment-methods" className={TEXT_LINK}>
                Add one
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
