import Icon from "@/components/admin-panel/Icon";
import { SOFT_COLOR_CLASSES } from "./colorClasses";

export default function QuickActions({ actions }) {
  return (
    <section className="lg:col-span-2 bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
      <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {actions.map((action) => (
          <a
            key={action.label}
            href={action.href}
            className={`flex flex-col items-center justify-center gap-2.5 text-center rounded-xl border border-slate-200 dark:border-white/10 p-4 hover:border-primary-300 dark:hover:border-accent-500/40 hover:shadow-md hover:-translate-y-0.5 transition-all${
              action.wide ? " sm:col-span-1 col-span-2" : ""
            }`}
          >
            <span className={`w-11 h-11 rounded-xl grid place-items-center ${SOFT_COLOR_CLASSES[action.iconColor]}`}>
              <Icon name={action.icon} className="w-5 h-5" />
            </span>
            <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">{action.label}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
