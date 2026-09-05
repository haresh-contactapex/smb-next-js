import Icon from "@/components/admin-panel/Icon";
import { formatCurrency, STATUS_LABELS } from "./helpers";

export default function MyGiftCardsSection({ cards }) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Your Gift Cards</h2>

      {cards.length === 0 ? (
        <p className="text-sm text-slate-400">No gift cards on your account yet.</p>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => {
            const status = STATUS_LABELS[card.status] ?? STATUS_LABELS.active;
            return (
              <div
                key={card.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/10"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-darksurface2 flex items-center justify-center shrink-0">
                    <Icon name="gift" className="w-5 h-5 text-slate-500 dark:text-slate-300" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white truncate font-mono tracking-wide">
                      {card.code}
                      <span className={`ml-2 inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full align-middle ${status.className}`}>
                        {status.label}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      Issued {card.issuedDate} · Expires {card.expiryDate}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{formatCurrency(card.balance)}</p>
                  <p className="text-[11px] text-slate-400">of {formatCurrency(card.initialValue)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
