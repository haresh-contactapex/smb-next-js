import Link from "next/link";
import Icon from "@/components/admin-panel/Icon";
import { BADGE_COLOR_CLASSES } from "@/components/dashboard/colorClasses";

const CARD = "bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6";

const PROVIDER_LABELS = { stripe: "Stripe", paypal: "PayPal", razorpay: "Razorpay", cod: "Cash on delivery" };
const PAYMENT_STATUS_COLORS = { succeeded: "success", pending: "warning", failed: "error", refunded: "info" };

function CardTitle({ icon, children }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-bold text-primary-700 dark:text-white mb-4">
      <Icon name={icon} className="w-4 h-4 text-slate-400" />
      {children}
    </h2>
  );
}

function Empty({ children }) {
  return <p className="text-sm text-slate-400">{children}</p>;
}

// What the customer asked to have engraved on this line. Shown in full, in its own block, because
// whoever fulfils the order has to engrave exactly this text in exactly this font. The text is
// rendered as plain text (React escapes it).
function PersonalizationBlock({ engraving }) {
  return (
    <div className="mt-2 rounded-xl border border-accent-500/30 bg-accent-500/5 px-3 py-2 text-xs w-fit max-w-full">
      <p className="flex items-center gap-1.5 font-bold uppercase tracking-wide text-accent-600 dark:text-accent-400">
        <Icon name="edit-2" className="w-3.5 h-3.5" />
        Personalization
      </p>
      <p className="mt-1 text-slate-600 dark:text-slate-300 break-words">
        Engraving: <span className="font-semibold text-slate-800 dark:text-white">{engraving.text}</span>
      </p>
      {engraving.fontName && (
        <p className="text-slate-600 dark:text-slate-300">
          Font: <span className="font-semibold text-slate-800 dark:text-white">{engraving.fontName}</span>
        </p>
      )}
    </div>
  );
}

export function OrderItemsCard({ items }) {
  return (
    <section className={CARD}>
      <CardTitle icon="shopping-bag">Products ({items.length})</CardTitle>
      {items.length === 0 ? (
        <Empty>No line items were recorded for this order.</Empty>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-white/5 -my-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-start sm:items-center gap-4 py-3">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- store-uploaded product photo, not optimizable by next/image
                <img src={item.image} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0 bg-slate-100 dark:bg-darksurface2" />
              ) : (
                <span className="w-14 h-14 rounded-xl shrink-0 grid place-items-center bg-slate-100 dark:bg-darksurface2 text-slate-300 dark:text-slate-600">
                  <Icon name="image" className="w-5 h-5" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                {item.productId ? (
                  <Link
                    href={`/admin/edit-product/${item.productId}`}
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-primary-600 dark:hover:text-accent-400"
                  >
                    {item.title}
                  </Link>
                ) : (
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.title}</p>
                )}
                {item.sku && <p className="text-xs text-slate-400 mt-0.5">SKU {item.sku}</p>}
                {item.engraving && <PersonalizationBlock engraving={item.engraving} />}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap hidden sm:block">
                {item.unitPrice} × {item.quantity}
              </p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap w-24 text-right">{item.lineTotal}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SummaryRow({ label, value, note, strong }) {
  return (
    <div className={`flex items-start justify-between gap-4 text-sm ${strong ? "pt-3 mt-1 border-t border-slate-100 dark:border-white/5" : ""}`}>
      <div>
        <p className={strong ? "font-bold text-slate-800 dark:text-white" : "text-slate-500 dark:text-slate-400"}>{label}</p>
        {note && <p className="text-xs text-slate-400 mt-0.5">{note}</p>}
      </div>
      <p className={`whitespace-nowrap ${strong ? "font-bold text-slate-800 dark:text-white" : "font-medium text-slate-700 dark:text-slate-200"}`}>
        {value ?? "—"}
      </p>
    </div>
  );
}

const TAX_NOTES = {
  added: "Added on top of the item prices.",
  included: "Already included in the item prices, so nothing was added.",
  unknown: "Tax wasn't recorded for this order.",
};

export function OrderSummaryCard({ pricing }) {
  const taxLabel = pricing.taxRate ? `Tax (${pricing.taxRate}%)` : "Tax";
  return (
    <section className={CARD}>
      <CardTitle icon="dollar-sign">Order summary &amp; tax</CardTitle>
      <div className="space-y-3">
        <SummaryRow label="Subtotal" value={pricing.subtotal} />
        {pricing.discount && (
          <SummaryRow
            label="Discount"
            note={pricing.couponCode ? `Coupon ${pricing.couponCode}` : undefined}
            value={`−${pricing.discount}`}
          />
        )}
        <SummaryRow label="Shipping" value={pricing.shippingFree ? "Free" : pricing.shipping} />
        <SummaryRow
          label={taxLabel}
          note={TAX_NOTES[pricing.taxMode]}
          value={pricing.taxMode === "included" ? "Included" : pricing.tax}
        />
        <SummaryRow label="Total" value={pricing.total} strong />
      </div>
    </section>
  );
}

export function CustomerCard({ customer }) {
  return (
    <section className={CARD}>
      <CardTitle icon="user">Customer</CardTitle>
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold text-slate-700 dark:text-slate-200">{customer.name}</p>
        {customer.isGuest && (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300">
            Guest checkout
          </span>
        )}
        {customer.group && !customer.isGuest && (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary-500/10 text-primary-600 dark:text-primary-300">
            {customer.group}
          </span>
        )}
      </div>
      {customer.hasAccount ? (
        <dl className="mt-3 space-y-2 text-sm">
          <div>
            <dt className="text-xs text-slate-400">Email</dt>
            <dd className="text-slate-700 dark:text-slate-200 break-all">
              <a href={`mailto:${customer.email}`} className="hover:text-primary-600 dark:hover:text-accent-400">
                {customer.email}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Phone</dt>
            <dd className="text-slate-700 dark:text-slate-200">{customer.phone || "—"}</dd>
          </div>
          {customer.since && (
            <div>
              <dt className="text-xs text-slate-400">{customer.isGuest ? "First order" : "Customer since"}</dt>
              <dd className="text-slate-700 dark:text-slate-200">{customer.since}</dd>
            </div>
          )}
        </dl>
      ) : (
        <p className="mt-2 text-sm text-slate-400">No customer account is linked to this order.</p>
      )}
    </section>
  );
}

export function AddressCard({ title, icon, address }) {
  const cityLine = [address?.city, [address?.state, address?.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return (
    <section className={CARD}>
      <CardTitle icon={icon}>{title}</CardTitle>
      {address ? (
        <address className="not-italic text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <p className="font-semibold text-slate-700 dark:text-slate-200">{address.fullName}</p>
          {address.company && <p>{address.company}</p>}
          <p>{address.line1}</p>
          {address.line2 && <p>{address.line2}</p>}
          {cityLine && <p>{cityLine}</p>}
          <p>{address.country}</p>
          {address.phone && <p className="mt-1 text-slate-500 dark:text-slate-400">{address.phone}</p>}
        </address>
      ) : (
        <Empty>No {title.toLowerCase()} was recorded for this order.</Empty>
      )}
    </section>
  );
}

export function PaymentsCard({ payments }) {
  return (
    <section className={CARD}>
      <CardTitle icon="credit-card">Payments</CardTitle>
      {payments.length === 0 ? (
        <Empty>No payment attempts were recorded for this order.</Empty>
      ) : (
        <ul className="space-y-4">
          {payments.map((payment) => (
            <li key={payment.id} className="text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-700 dark:text-slate-200">{PROVIDER_LABELS[payment.provider] || payment.provider}</p>
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize ${BADGE_COLOR_CLASSES[PAYMENT_STATUS_COLORS[payment.status] || "info"]}`}
                >
                  {payment.status}
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                {payment.amount} · {payment.date}
              </p>
              {payment.reference && <p className="mt-1 font-mono text-[11px] text-slate-400 break-all">{payment.reference}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
