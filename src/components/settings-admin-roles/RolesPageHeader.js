import Link from "next/link";
import Icon from "@/components/admin-panel/Icon";

// Settings-style breadcrumb header shared by the list, add/edit and view
// screens. `crumb` adds a level after "Admin & Roles"; `children` are the
// right-aligned actions.
export default function RolesPageHeader({ title, crumb, children }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div className="min-w-0">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Icon name="shield" className="w-4 h-4" />
          <span>Settings</span>
          <span>/</span>
          {crumb ? (
            <>
              <Link href="/settings/admin-roles" className="hover:text-primary-600 dark:hover:text-accent-400">
                Admin &amp; Roles
              </Link>
              <span>/</span>
              <span className="font-semibold text-slate-800 dark:text-white truncate">{crumb}</span>
            </>
          ) : (
            <span className="font-semibold text-slate-800 dark:text-white">Admin &amp; Roles</span>
          )}
        </nav>
        <h1 className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-white truncate">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}

export const PRIMARY_BUTTON_CLASSES =
  "inline-flex items-center gap-2 px-4 h-9 rounded-xl bg-primary-500 dark:bg-accent-500 hover:bg-primary-600 dark:hover:bg-accent-600 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:pointer-events-none";

export const SECONDARY_BUTTON_CLASSES =
  "inline-flex items-center gap-2 px-4 h-9 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:pointer-events-none";

export const DANGER_BUTTON_CLASSES =
  "inline-flex items-center gap-2 px-4 h-9 rounded-xl border border-red-200 dark:border-red-500/30 text-xs font-semibold text-error hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:pointer-events-none";
