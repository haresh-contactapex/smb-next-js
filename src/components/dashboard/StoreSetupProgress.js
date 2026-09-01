import Icon from "@/components/admin-panel/Icon";

export default function StoreSetupProgress({ data }) {
  return (
    <div className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-100">Finish setting up your store</h3>
          <p className="text-[12px] text-slate-400 mt-0.5">
            {data.completedCount} of {data.totalCount} steps complete — you&apos;re almost live.
          </p>
        </div>
        <span className="text-[11px] font-bold text-primary-600 dark:text-accent-400 bg-primary-50 dark:bg-accent-500/10 px-2.5 py-1 rounded-full">
          {data.percent}% complete
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {data.steps.map((step) => (
          <div key={step.label} className="flex sm:flex-col items-center sm:items-start gap-2">
            <span
              className={`w-7 h-7 rounded-full grid place-items-center shrink-0 ${
                step.status === "warning" ? "bg-warning/10 text-warning ring-2 ring-warning/20" : "bg-success/10 text-success"
              }`}
            >
              <Icon name={step.status === "warning" ? "alert-triangle" : "check"} className="w-3.5 h-3.5" />
            </span>
            <span
              className={`text-[12px] font-medium ${
                step.status === "warning" ? "text-slate-700 dark:text-slate-200" : "text-slate-600 dark:text-slate-300"
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
