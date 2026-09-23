import Link from "next/link";
import Icon from "@/components/admin-panel/Icon";
import { STATUS_BADGE_CLASSES, STATUS_LABELS, formatDate, summarizePermissions } from "./helpers";
import { deleteBlockedReason } from "./roleActions";

const ICON_BUTTON =
  "w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none";

function PermissionsSummary({ role, modules }) {
  if (role.fullAccess) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-accent-500/10 text-accent-700 dark:text-accent-300">
        <Icon name="shield" className="w-3 h-3" />
        Full access
      </span>
    );
  }
  const summary = summarizePermissions(role, modules);
  if (summary.granted === 0) return <span className="text-slate-400 text-xs">No permissions</span>;
  const shown = summary.modules.slice(0, 3);
  const more = summary.modules.length - shown.length;
  return (
    <div className="min-w-0">
      <span className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
        {summary.granted} of {summary.total} · {summary.modules.length} module{summary.modules.length === 1 ? "" : "s"}
      </span>
      <span className="block text-[11px] text-slate-400 truncate max-w-[220px]" title={summary.modules.join(", ")}>
        {shown.join(", ")}
        {more > 0 ? ` +${more} more` : ""}
      </span>
    </div>
  );
}

export default function RolesTable({ roles, modules, busyId, onDuplicate, onDelete, onToggleStatus }) {
  if (roles.length === 0) {
    return <div className="py-16 text-center text-sm text-slate-400">No roles match your filters.</div>;
  }

  return (
    <div className="overflow-x-auto custom-scroll -mx-1">
      <table className="w-full text-sm min-w-[1080px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-white/5">
            <th scope="col" className="py-3 px-2 font-semibold">Role Name</th>
            <th scope="col" className="py-3 px-2 font-semibold">Description</th>
            <th scope="col" className="py-3 px-2 font-semibold text-center">Users Assigned</th>
            <th scope="col" className="py-3 px-2 font-semibold">Permissions Summary</th>
            <th scope="col" className="py-3 px-2 font-semibold">Status</th>
            <th scope="col" className="py-3 px-2 font-semibold">Created</th>
            <th scope="col" className="py-3 px-2 font-semibold">Updated</th>
            <th scope="col" className="py-3 px-2 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {roles.map((role) => {
            const busy = busyId === role.id;
            const blockedReason = deleteBlockedReason(role);
            const nextStatus = role.status === "active" ? "inactive" : "active";
            return (
              <tr key={role.id} className="table-row transition-colors" aria-busy={busy}>
                <td className="py-3 px-2">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0 bg-primary-50 text-primary-600 dark:bg-accent-500/10 dark:text-accent-400">
                      <Icon name={role.fullAccess ? "shield" : "users"} className="w-4 h-4" />
                    </span>
                    <span className="min-w-0">
                      <Link
                        href={`/settings/admin-roles/${role.id}`}
                        className="block font-medium text-slate-700 dark:text-slate-200 hover:text-primary-600 dark:hover:text-accent-400 truncate"
                      >
                        {role.name}
                      </Link>
                      {role.isSystem && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          <Icon name="lock" className="w-3 h-3" />
                          System
                        </span>
                      )}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-2 text-slate-500 dark:text-slate-400">
                  <span className="block max-w-[260px] line-clamp-2 text-xs" title={role.description}>
                    {role.description || "—"}
                  </span>
                </td>
                <td className="py-3 px-2 text-center font-semibold text-slate-600 dark:text-slate-300">{role.usersAssigned}</td>
                <td className="py-3 px-2">
                  <PermissionsSummary role={role} modules={modules} />
                </td>
                <td className="py-3 px-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${STATUS_BADGE_CLASSES[role.status]}`}>
                    {STATUS_LABELS[role.status] || role.status}
                  </span>
                </td>
                <td className="py-3 px-2 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(role.createdAt)}</td>
                <td className="py-3 px-2 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(role.updatedAt)}</td>
                <td className="py-3 px-2 text-right">
                  <div className="inline-flex items-center gap-1">
                    <Link href={`/settings/admin-roles/${role.id}`} title="View role" aria-label={`View ${role.name}`} className={ICON_BUTTON}>
                      <Icon name="eye" className="w-4 h-4" />
                    </Link>
                    <Link
                      href={`/settings/admin-roles/${role.id}/edit`}
                      title="Edit role"
                      aria-label={`Edit ${role.name}`}
                      className={ICON_BUTTON}
                    >
                      <Icon name="edit-2" className="w-4 h-4" />
                    </Link>
                    <button
                      type="button"
                      title="Duplicate role"
                      aria-label={`Duplicate ${role.name}`}
                      onClick={() => onDuplicate(role)}
                      disabled={busy}
                      className={ICON_BUTTON}
                    >
                      <Icon name="copy" className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title={
                        role.isSystem ? "System roles are always active" : nextStatus === "active" ? "Activate role" : "Deactivate role"
                      }
                      aria-label={`${nextStatus === "active" ? "Activate" : "Deactivate"} ${role.name}`}
                      onClick={() => onToggleStatus(role, nextStatus)}
                      disabled={busy || role.isSystem}
                      className={`${ICON_BUTTON} ${nextStatus === "active" ? "hover:text-success" : "hover:text-warning"}`}
                    >
                      <Icon name={nextStatus === "active" ? "check-circle" : "x-circle"} className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title={blockedReason || "Delete role"}
                      aria-label={blockedReason ? `${role.name} can't be deleted: ${blockedReason}` : `Delete ${role.name}`}
                      onClick={() => onDelete(role)}
                      disabled={busy || Boolean(blockedReason)}
                      className={`${ICON_BUTTON} hover:!bg-red-50 hover:text-error dark:hover:!bg-red-500/10`}
                    >
                      <Icon name={busy ? "refresh-cw" : "trash-2"} className={`w-4 h-4${busy ? " animate-spin" : ""}`} />
                    </button>
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
