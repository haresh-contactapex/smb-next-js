import Link from "next/link";
import Icon from "@/components/admin-panel/Icon";
import { AVATAR_COLOR_CLASSES, BADGE_COLOR_CLASSES } from "./colorClasses";

export default function RecentOrdersTable({ orders, viewAllHref = "#" }) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-800 dark:text-white">Recent Orders</h3>
        <Link href={viewAllHref} className="text-[13px] font-semibold text-primary-600 dark:text-accent-400 hover:underline">
          View All Orders →
        </Link>
      </div>
      <div className="md:hidden space-y-3">
        {orders.length === 0 && <div className="py-8 text-center text-sm text-slate-400">No orders yet.</div>}
        {orders.map((order) => (
          <div key={order.id} className="rounded-xl border border-slate-100 dark:border-white/10 p-3 bg-white dark:bg-darksurface">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-8 h-8 rounded-full text-[11px] font-bold grid place-items-center shrink-0 ${AVATAR_COLOR_CLASSES[order.avatarColor]}`}
                >
                  {order.initials}
                </span>
                <div className="min-w-0">
                  <div className="font-semibold text-primary-700 dark:text-accent-400 text-sm">{order.id}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{order.customer}</div>
                </div>
              </div>
              <div className="inline-flex items-center gap-1 shrink-0">
                <Link
                  href={`/admin/orders/${order.orderId}`}
                  aria-label={`View order ${order.id}`}
                  className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  <Icon name="eye" className="w-4 h-4" />
                </Link>
                <Link
                  href={`/admin/edit-order/${order.orderId}`}
                  aria-label={`Edit order ${order.id}`}
                  className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  <Icon name="edit-2" className="w-4 h-4" />
                </Link>
              </div>
            </div>
            <dl className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
              {[
                ["Date", order.date],
                ["Products", order.products],
                ["Amount", <span key="a" className="font-semibold text-slate-700 dark:text-slate-200">{order.amount}</span>],
                [
                  "Payment",
                  <span key="p" className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${BADGE_COLOR_CLASSES[order.paymentColor]}`}>
                    {order.payment}
                  </span>,
                ],
                [
                  "Status",
                  <span key="s" className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${BADGE_COLOR_CLASSES[order.statusColor]}`}>
                    {order.status}
                  </span>,
                ],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 py-2">
                  <dt className="text-slate-400 shrink-0">{label}</dt>
                  <dd className="text-right text-slate-500 dark:text-slate-400 min-w-0">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      <div className="hidden md:block overflow-x-auto custom-scroll -mx-1">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-white/5">
              <th className="py-3 px-1 font-semibold">Order ID</th>
              <th className="py-3 px-1 font-semibold">Customer</th>
              <th className="py-3 px-1 font-semibold">Date</th>
              <th className="py-3 px-1 font-semibold">Products</th>
              <th className="py-3 px-1 font-semibold">Amount</th>
              <th className="py-3 px-1 font-semibold">Payment</th>
              <th className="py-3 px-1 font-semibold">Status</th>
              <th className="py-3 px-1 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {orders.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">No orders yet.</td>
              </tr>
            )}
            {orders.map((order) => (
              <tr key={order.id} className="table-row transition-colors">
                <td className="py-3 px-1 font-semibold text-primary-700 dark:text-accent-400">{order.id}</td>
                <td className="py-3 px-1">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-7 h-7 rounded-full text-[11px] font-bold grid place-items-center shrink-0 ${AVATAR_COLOR_CLASSES[order.avatarColor]}`}
                    >
                      {order.initials}
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">{order.customer}</span>
                  </div>
                </td>
                <td className="py-3 px-1 text-slate-500 dark:text-slate-400">{order.date}</td>
                <td className="py-3 px-1 text-slate-500 dark:text-slate-400">{order.products}</td>
                <td className="py-3 px-1 font-semibold text-slate-700 dark:text-slate-200">{order.amount}</td>
                <td className="py-3 px-1">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${BADGE_COLOR_CLASSES[order.paymentColor]}`}>
                    {order.payment}
                  </span>
                </td>
                <td className="py-3 px-1">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${BADGE_COLOR_CLASSES[order.statusColor]}`}>
                    {order.status}
                  </span>
                </td>
                <td className="py-3 px-1 text-right">
                  <div className="inline-flex items-center gap-1">
                    <Link
                      href={`/admin/orders/${order.orderId}`}
                      title="View order"
                      aria-label={`View order ${order.id}`}
                      className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                    >
                      <Icon name="eye" className="w-4 h-4" />
                    </Link>
                    <Link
                      href={`/admin/edit-order/${order.orderId}`}
                      title="Edit order"
                      aria-label={`Edit order ${order.id}`}
                      className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                    >
                      <Icon name="edit-2" className="w-4 h-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
