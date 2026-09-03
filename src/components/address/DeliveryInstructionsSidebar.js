import Icon from "@/components/admin-panel/Icon";

export default function DeliveryInstructionsSidebar({ value, onChange }) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-1.5">
        <Icon name="edit-2" className="w-4 h-4 text-slate-400" /> Delivery Instructions
      </h2>
      <p className="text-xs text-slate-400 mb-3">Optional notes for the courier, e.g. gate codes or drop-off spot.</p>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Leave with front desk security…"
        aria-label="Delivery instructions"
        className="w-full p-3 rounded-xl bg-slate-100 dark:bg-darksurface2 border border-transparent focus:border-primary-400 dark:focus:border-accent-500 focus:bg-white dark:focus:bg-darksurface2 focus:outline-none focus:ring-4 focus:ring-primary-500/10 text-sm transition-all font-medium text-slate-800 dark:text-white resize-y"
      />
    </section>
  );
}
