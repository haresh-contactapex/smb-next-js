import Link from "next/link";
import Icon from "@/components/admin-panel/Icon";
import { formatDate, fullName, initialsFor, isLocked } from "./helpers";
import { deleteBlockedReason, editBlockedReason } from "./userActions";

const ICON_BUTTON =
  "w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none";

function SortableHeader({ label, sortKey, sort, onSortChange }) {
  const active = sort?.key === sortKey;
  const icon = active ? (sort.direction === "asc" ? "chevron-up" : "chevron-down") : "arrow-up-down";
  return (
    <th scope="col" className="py-3 px-2 font-semibold">
      <button
        type="button"
        onClick={() => onSortChange(sortKey)}
        aria-label={`Sort by ${label}${active ? (sort.direction === "asc" ? ", ascending" : ", descending") : ""}`}
        className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
      >
        {label}
        <Icon name={icon} className={`w-3 h-3 ${active ? "text-primary-500 dark:text-accent-400" : "text-slate-300 dark:text-slate-600"}`} />
      </button>
    </th>
  );
}

function RoleBadge({ user }) {
  const inactive = user.roleStatus === "inactive";
  const missing = !user.roleStatus;
  return (
    <span className="inline-flex flex-col">
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
        {user.roleFullAccess && <Icon name="shield" className="w-3 h-3 text-accent-600 dark:text-accent-400" />}
        {user.roleName}
      </span>
      {(inactive || missing) && (
        <span className="text-[10px] font-bold uppercase tracking-wide text-warning">
          {missing ? "Role missing" : "Role inactive"}
        </span>
      )}
    </span>
  );
}

export default function UsersTable({ users, busyId, permissions, context, onDelete, sort, onSortChange }) {
  if (users.length === 0) {
    return <div className="py-16 text-center text-sm text-slate-400">No users match your filters.</div>;
  }

  return (
    <div className="overflow-x-auto custom-scroll -mx-1">
      <table className="w-full text-sm min-w-[960px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-white/5">
            <SortableHeader label="User" sortKey="name" sort={sort} onSortChange={onSortChange} />
            <th scope="col" className="py-3 px-2 font-semibold">Phone</th>
            <SortableHeader label="Role" sortKey="role" sort={sort} onSortChange={onSortChange} />
            <th scope="col" className="py-3 px-2 font-semibold">2FA</th>
            <SortableHeader label="Status" sortKey="status" sort={sort} onSortChange={onSortChange} />
            <SortableHeader label="Last Login" sortKey="lastLogin" sort={sort} onSortChange={onSortChange} />
            <SortableHeader label="Created" sortKey="created" sort={sort} onSortChange={onSortChange} />
            <th scope="col" className="py-3 px-2 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {users.map((user) => {
            const busy = busyId === user.id;
            const name = fullName(user);
            const locked = isLocked(user);
            const editBlocked = editBlockedReason(user, context);
            const deleteBlocked = deleteBlockedReason(user, context);
            const isSelf = user.id === context.currentUserId;
            return (
              <tr key={user.id} className="table-row transition-colors" aria-busy={busy}>
                <td className="py-3 px-2">
                  <div className="flex items-center gap-3">
                    {user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />
                    ) : (
                      <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0 bg-primary-50 text-primary-600 dark:bg-accent-500/10 dark:text-accent-400 text-xs font-bold">
                        {initialsFor(user)}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200 truncate">
                        {name}
                        {isSelf && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400">
                            You
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-slate-400 truncate max-w-[240px]">{user.email}</span>
                    </span>
                  </div>
                </td>
                <td className="py-3 px-2 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{user.phone || "—"}</td>
                <td className="py-3 px-2">
                  <RoleBadge user={user} />
                </td>
                <td className="py-3 px-2 text-xs">
                  {user.twoFactorEnabled ? (
                    <span className="text-success font-semibold">On</span>
                  ) : (
                    <span className="text-slate-400">Off</span>
                  )}
                </td>
                <td className="py-3 px-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      locked ? "bg-error/10 text-error" : "bg-success/10 text-success"
                    }`}
                  >
                    {locked ? "Locked" : "Active"}
                  </span>
                </td>
                <td className="py-3 px-2 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}
                </td>
                <td className="py-3 px-2 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(user.createdAt)}</td>
                <td className="py-3 px-2 text-right">
                  <div className="inline-flex items-center gap-1">
                    {permissions.canEdit && (
                      editBlocked ? (
                        <span title={editBlocked} aria-label={`${name} can't be edited: ${editBlocked}`} className={`${ICON_BUTTON} opacity-40`}>
                          <Icon name="edit-2" className="w-4 h-4" />
                        </span>
                      ) : (
                        <Link href={`/users/${user.id}/edit`} title="Edit user" aria-label={`Edit ${name}`} className={ICON_BUTTON}>
                          <Icon name="edit-2" className="w-4 h-4" />
                        </Link>
                      )
                    )}
                    {permissions.canDelete && (
                      <button
                        type="button"
                        title={deleteBlocked || "Delete user"}
                        aria-label={deleteBlocked ? `${name} can't be deleted: ${deleteBlocked}` : `Delete ${name}`}
                        onClick={() => onDelete(user)}
                        disabled={busy || Boolean(deleteBlocked)}
                        className={`${ICON_BUTTON} hover:!bg-red-50 hover:text-error dark:hover:!bg-red-500/10`}
                      >
                        <Icon name="trash-2" className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
