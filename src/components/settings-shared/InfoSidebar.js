import Icon from "@/components/admin-panel/Icon";

export default function InfoSidebar({ icon = "check-circle", title, points }) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-3">{title}</h2>
      <ul className="space-y-2.5">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Icon name={icon} className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
