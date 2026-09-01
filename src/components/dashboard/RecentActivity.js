import Icon from "@/components/admin-panel/Icon";
import { SOFT_COLOR_CLASSES } from "./colorClasses";

export default function RecentActivity({ activity }) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
      <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4">Recent Activity</h3>
      <div className="space-y-4 max-h-[360px] overflow-y-auto custom-scroll pr-1">
        {activity.map((item, i) => (
          <div key={i} className="flex gap-3">
            <span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${SOFT_COLOR_CLASSES[item.iconColor]}`}>
              <Icon name={item.icon} className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-slate-700 dark:text-slate-200">{item.text}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{item.time}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
