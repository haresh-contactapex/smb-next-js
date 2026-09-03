export default function JsonPayloadCard({ onPreview }) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-2">JSON payload</h2>
      <p className="text-xs text-slate-400 mb-3 leading-relaxed">
        There&apos;s no live backend here — &quot;Save product&quot; assembles this form into the product JSON
        below, ready to copy or send to your API.
      </p>
      <button
        type="button"
        onClick={onPreview}
        className="w-full flex items-center justify-center h-9 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
      >
        Preview JSON
      </button>
    </section>
  );
}
