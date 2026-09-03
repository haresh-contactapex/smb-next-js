import Icon from "@/components/admin-panel/Icon";
import { ACCEPTED_CARD_BRANDS } from "@/data/accountData";

export default function AcceptedPaymentsSidebar() {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-1">Accepted Cards</h2>
      <p className="text-xs text-slate-400 mb-3">These card networks can be added as a payment method.</p>
      <div className="space-y-1">
        {ACCEPTED_CARD_BRANDS.map((brand) => (
          <div key={brand} className="flex items-center gap-2.5 p-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <Icon name="credit-card" className="w-4 h-4 text-slate-400" /> {brand}
          </div>
        ))}
      </div>
    </section>
  );
}
