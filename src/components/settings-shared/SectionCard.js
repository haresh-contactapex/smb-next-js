export default function SectionCard({ title, description, children, className = "" }) {
  return (
    <section className={`bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6 ${className}`}>
      <h2 className={`text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5 ${description ? "mb-1" : "mb-4"}`}>{title}</h2>
      {description && <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{description}</p>}
      <div className="space-y-4">{children}</div>
    </section>
  );
}
