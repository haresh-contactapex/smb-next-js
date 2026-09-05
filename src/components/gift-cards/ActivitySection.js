import Icon from "@/components/admin-panel/Icon";
import { formatCurrency } from "./helpers";

export default function ActivitySection({ transactions }) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-1.5">
        <Icon name="clock" className="w-4 h-4 text-slate-400" /> Gift Card Activity
      </h2>

      {transactions.length === 0 ? (
        <p className="text-sm text-slate-400">No gift card activity yet.</p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{tx.description}</p>
                <p className="text-xs text-slate-400">{tx.date}</p>
              </div>
              <p className={`text-sm font-bold shrink-0 ${tx.amount < 0 ? "text-slate-500 dark:text-slate-400" : "text-success"}`}>
                {tx.amount < 0 ? "-" : "+"}
                {formatCurrency(Math.abs(tx.amount))}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
