import Icon from "@/components/admin-panel/Icon";
import { SOFT_COLOR_CLASSES } from "./colorClasses";

function TrendBadge({ trend, change }) {
  return (
    <span className={`flex items-center gap-0.5 text-[11px] font-bold ${trend === "up" ? "text-success" : "text-error"}`}>
      <Icon name={trend === "up" ? "trending-up" : "trending-down"} className="w-3 h-3" />
      {change}
    </span>
  );
}

export default function OrderStatsSection({ stats, totalSales }) {
  return (
    <section>
      <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3">Orders</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`w-10 h-10 rounded-xl grid place-items-center ${SOFT_COLOR_CLASSES[stat.iconColor]}`}>
                <Icon name={stat.icon} className="w-5 h-5" />
              </span>
              <TrendBadge trend={stat.trend} change={stat.change} />
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{stat.value}</p>
            <p className="text-[12px] text-slate-400 mt-0.5">{stat.label}</p>
            <p className="text-[11px] text-slate-400 mt-2">vs last month</p>
          </div>
        ))}

        <div className="bg-primary-500 dark:bg-primary-600 rounded-2xl shadow-card p-4 text-white relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="w-10 h-10 rounded-xl bg-white/15 grid place-items-center">
              <Icon name="dollar-sign" className="w-5 h-5" />
            </span>
            <span className="flex items-center gap-0.5 text-[11px] font-bold text-accent-300">
              <Icon name="trending-up" className="w-3 h-3" />
              {totalSales.change}
            </span>
          </div>
          <p className="text-2xl font-bold">{totalSales.value}</p>
          <p className="text-[12px] text-white/70 mt-0.5">{totalSales.label}</p>
          <p className="text-[11px] text-white/50 mt-2">vs last month</p>
        </div>
      </div>
    </section>
  );
}
