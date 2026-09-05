export default function SectionCard({ title, children, className = "" }) {
  return (
    <section className={`bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6 ${className}`}>
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-1.5">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
