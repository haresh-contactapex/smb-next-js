import Icon from "@/components/admin-panel/Icon";

export default function BillingAddressSidebar({ sameAsShipping, onSameAsShippingChange }) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-1.5">
        <Icon name="map-pin" className="w-4 h-4 text-slate-400" /> Billing Address
      </h2>

      <address className="not-italic text-sm text-slate-700 dark:text-slate-200 leading-relaxed mb-3">
        <span className="block">Haresh Ambaliya</span>
        <span className="block">123 Ring Ave, Suite 200</span>
        <span className="block">Los Angeles, CA 90012</span>
        <span className="block">United States</span>
      </address>

      <label className="toggle-row text-sm text-slate-700 dark:text-slate-200 mb-2">
        <input
          type="checkbox"
          checked={sameAsShipping}
          onChange={(e) => onSameAsShippingChange(e.target.checked)}
        />
        Same as shipping address
      </label>

      <p className="text-[11px] text-slate-400">
        Manage saved addresses on the{" "}
        <a href="/address" className="font-semibold text-primary-600 dark:text-accent-400 hover:underline">
          Address
        </a>{" "}
        page.
      </p>
    </section>
  );
}
