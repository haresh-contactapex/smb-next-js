import Link from "next/link";
import Icon from "@/components/admin-panel/Icon";
import { AVATAR_COLOR_CLASSES } from "@/components/dashboard/colorClasses";
import { pickAvatarColor, getInitials, formatDate, GROUP_BADGE_CLASSES } from "./customerHelpers";
import { Can } from "@/components/providers/StaffPermissionsProvider";

export default function CustomersTable({ customers, onDelete }) {
  if (customers.length === 0) {
    return <div className="py-16 text-center text-sm text-slate-400">No customers match your filters.</div>;
  }

  return (
    <div className="overflow-x-auto custom-scroll -mx-1">
      <table className="w-full text-sm min-w-[900px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-white/5">
            <th className="py-3 px-1 font-semibold">Customer</th>
            <th className="py-3 px-1 font-semibold">Phone</th>
            <th className="py-3 px-1 font-semibold">Group</th>
            <th className="py-3 px-1 font-semibold">Loyalty Points</th>
            <th className="py-3 px-1 font-semibold">Marketing</th>
            <th className="py-3 px-1 font-semibold">Joined</th>
            <th className="py-3 px-1 font-semibold text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {customers.map((customer) => (
            <tr key={customer.id} className="table-row transition-colors">
              <td className="py-3 px-1">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-9 h-9 rounded-full text-[11px] font-bold grid place-items-center shrink-0 ${AVATAR_COLOR_CLASSES[pickAvatarColor(customer.id)]}`}
                  >
                    {getInitials(customer.firstName, customer.lastName)}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200 truncate">
                      {customer.firstName} {customer.lastName}
                      {customer.isGuest && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/60 dark:bg-white/10 text-slate-500 dark:text-slate-300">
                          Guest
                        </span>
                      )}
                    </span>
                    <span className="block text-[11px] text-slate-400 truncate system-field">{customer.email}</span>
                  </span>
                </div>
              </td>
              <td className="py-3 px-1 text-slate-500 dark:text-slate-400 system-field">{customer.phone || "—"}</td>
              <td className="py-3 px-1">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${GROUP_BADGE_CLASSES[customer.customerGroup]}`}
                >
                  {customer.customerGroup}
                </span>
              </td>
              <td className="py-3 px-1 text-slate-600 dark:text-slate-300">{customer.loyaltyPoints}</td>
              <td className="py-3 px-1 text-slate-500 dark:text-slate-400">
                {customer.acceptsMarketing ? "Subscribed" : "Not subscribed"}
              </td>
              <td className="py-3 px-1 text-slate-500 dark:text-slate-400">{formatDate(customer.createdAt)}</td>
              <td className="py-3 px-1 text-right">
                <div className="inline-flex items-center gap-1">
                  <Can permission="customers.edit">
                    <Link
                      href={`/edit-customer/${customer.id}`}
                      title="Edit customer"
                      className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                    >
                      <Icon name="edit-2" className="w-4 h-4" />
                    </Link>
                  </Can>
                  <Can permission="customers.delete">
                    <button
                      type="button"
                      title="Delete customer"
                      onClick={() => onDelete?.(customer)}
                      className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-error dark:hover:bg-red-500/10"
                    >
                      <Icon name="trash-2" className="w-4 h-4" />
                    </button>
                  </Can>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
