import Icon from "@/components/admin-panel/Icon";

export default function SavedCardsSection({ cards, onMakeDefault, onRemove }) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Saved Cards</h2>

      {cards.length === 0 ? (
        <p className="text-sm text-slate-400">No saved payment methods yet.</p>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <div
              key={card.id}
              className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/10"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-darksurface2 flex items-center justify-center shrink-0">
                  <Icon name="credit-card" className="w-5 h-5 text-slate-500 dark:text-slate-300" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                    {card.brand} •••• {card.last4}
                    {card.isDefault && (
                      <span className="ml-2 inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/10 text-success align-middle">
                        Default
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {card.holder} · Expires {card.expMonth}/{card.expYear}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {!card.isDefault && (
                  <button
                    type="button"
                    onClick={() => onMakeDefault(card.id)}
                    className="px-3 h-8 rounded-lg border border-slate-200 dark:border-white/10 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    Make Default
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Remove ${card.brand} ending in ${card.last4}`}
                  onClick={() => onRemove(card.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-error hover:bg-error/5 transition-colors"
                >
                  <Icon name="x-circle" className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
