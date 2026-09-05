import Icon from "@/components/admin-panel/Icon";
import { SOFT_COLOR_CLASSES } from "@/components/dashboard/colorClasses";

export default function OrdersStats({ stats }) {
  const cards = [
    { icon: "shopping-bag", iconColor: "primary", value: stats.total, label: "Total Orders" },
    { icon: "clock", iconColor: "warning", value: stats.pending, label: "Pending" },
    { icon: "refresh-cw", iconColor: "info", value: stats.processing, label: "Processing" },
    { icon: "check-circle", iconColor: "success", value: stats.completed, label: "Completed" },
    { icon: "x-circle", iconColor: "error", value: stats.cancelled, label: "Cancelled" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-4"
        >
          <span className={`w-9 h-9 rounded-xl grid place-items-center mb-3 ${SOFT_COLOR_CLASSES[card.iconColor]}`}>
            <Icon name={card.icon} className="w-[18px] h-[18px]" />
          </span>
          <p className="text-xl font-bold text-slate-800 dark:text-white">{card.value}</p>
          <p className="text-[12px] text-slate-400 mt-0.5">{card.label}</p>
        </div>
      ))}
    </div>
  );
}
