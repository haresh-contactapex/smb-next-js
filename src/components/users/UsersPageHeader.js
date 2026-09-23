import Link from "next/link";
import Icon from "@/components/admin-panel/Icon";

// Breadcrumb header shared by the list and add/edit screens. `crumb` adds a
// level after "Users"; `children` are the right-aligned actions.
export default function UsersPageHeader({ title, crumb, children }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div className="min-w-0">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Icon name="users" className="w-4 h-4" />
          {crumb ? (
            <>
              <Link href="/users" className="hover:text-primary-600 dark:hover:text-accent-400">
                Users
              </Link>
              <span>/</span>
              <span className="font-semibold text-slate-800 dark:text-white truncate">{crumb}</span>
            </>
          ) : (
            <span className="font-semibold text-slate-800 dark:text-white">Users</span>
          )}
        </nav>
        <h1 className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-white truncate">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}

// Same button treatments as Roles & Permissions.
export {
  PRIMARY_BUTTON_CLASSES,
  SECONDARY_BUTTON_CLASSES,
  DANGER_BUTTON_CLASSES,
} from "@/components/settings-admin-roles/RolesPageHeader";
