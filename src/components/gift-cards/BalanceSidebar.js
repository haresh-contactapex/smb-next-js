import Icon from "@/components/admin-panel/Icon";
import { formatCurrency } from "./helpers";

export default function BalanceSidebar({ balance, activeCount }) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-1.5">
        <Icon name="gift" className="w-4 h-4 text-slate-400" /> Available Balance
      </h2>

      <p className="text-3xl font-bold text-primary-700 dark:text-white mb-1">{formatCurrency(balance)}</p>
      <p className="text-xs text-slate-400 mb-4">
        Across {activeCount} active gift card{activeCount === 1 ? "" : "s"}
      </p>

      <p className="text-[11px] text-slate-400 mb-3">
        Your balance is applied automatically at checkout before any other payment method.
      </p>

      <a
        href="#"
        className="w-full inline-flex items-center justify-center px-4 h-9 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
      >
        Buy a Gift Card
      </a>
    </section>
  );
}
