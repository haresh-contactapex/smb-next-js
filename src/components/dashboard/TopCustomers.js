import Link from "next/link";
import { AVATAR_COLOR_CLASSES } from "./colorClasses";

export default function TopCustomers({ customers, viewAllHref = "#" }) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-800 dark:text-white">Top Customers</h3>
        <Link href={viewAllHref} className="text-[13px] font-semibold text-primary-600 dark:text-accent-400 hover:underline">
          View All →
        </Link>
      </div>
      <div className="space-y-4 max-h-[360px] overflow-y-auto custom-scroll pr-1">
        {customers.length === 0 && <p className="text-[13px] text-slate-400">No customers with orders yet.</p>}
        {customers.map((customer) => (
          <div key={customer.key} className="flex items-center gap-3">
            <span
              className={`w-10 h-10 rounded-full text-[13px] font-bold grid place-items-center shrink-0 ${AVATAR_COLOR_CLASSES[customer.avatarColor]}`}
            >
              {customer.initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate">{customer.name}</p>
              <p className="text-[12px] text-slate-400 truncate">{customer.contact}</p>
            </div>
            <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
              Orders: {customer.orders}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
