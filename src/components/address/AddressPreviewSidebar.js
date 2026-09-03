import Icon from "@/components/admin-panel/Icon";
import { formatAddressLines } from "./helpers";

function PreviewBlock({ title, lines }) {
  return (
    <div>
      <p className="text-[12px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
        {title}
      </p>
      {lines.length > 0 ? (
        <address className="not-italic text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
          {lines.map((line, i) => (
            <span key={i} className="block">
              {line}
            </span>
          ))}
        </address>
      ) : (
        <p className="text-sm text-slate-400">Not set yet.</p>
      )}
    </div>
  );
}

export default function AddressPreviewSidebar({ billing, shipping, shippingSameAsBilling }) {
  const billingLines = formatAddressLines(billing);
  const shippingLines = shippingSameAsBilling ? billingLines : formatAddressLines(shipping);

  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 space-y-4">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
        <Icon name="eye" className="w-4 h-4 text-slate-400" /> Address Preview
      </h2>
      <PreviewBlock title="Billing" lines={billingLines} />
      <div className="border-t border-slate-100 dark:border-white/5 pt-4">
        <PreviewBlock title="Shipping" lines={shippingLines} />
      </div>
    </section>
  );
}
