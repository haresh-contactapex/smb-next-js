import Icon from "@/components/admin-panel/Icon";
import { SOFT_COLOR_CLASSES } from "./colorClasses";

/** Reusable 2x2 stat grid — used for Products and Coupons/Gift Cards sections. */
export default function MiniStatGrid({ title, stats }) {
  return (
    <section>
      <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3">{title}</h2>
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-4"
          >
            <span className={`w-9 h-9 rounded-xl grid place-items-center mb-3 ${SOFT_COLOR_CLASSES[stat.iconColor]}`}>
              <Icon name={stat.icon} className="w-[18px] h-[18px]" />
            </span>
            <p className="text-xl font-bold text-slate-800 dark:text-white">{stat.value}</p>
            <p className="text-[12px] text-slate-400 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
