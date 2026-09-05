import Icon from "@/components/admin-panel/Icon";
import { AVATAR_COLOR_CLASSES, BADGE_COLOR_CLASSES } from "@/components/dashboard/colorClasses";

export default function OrdersTable({ orders }) {
  if (orders.length === 0) {
    return <div className="py-16 text-center text-sm text-slate-400">No orders match your filters.</div>;
  }

  return (
    <div className="overflow-x-auto custom-scroll -mx-1">
      <table className="w-full text-sm min-w-[860px]">
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
                  <button
                    type="button"
                    title="View order"
                    className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                  >
                    <Icon name="eye" className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    title="Edit order"
                    className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                  >
                    <Icon name="edit-2" className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
