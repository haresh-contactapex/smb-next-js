import Breadcrumbs from "@/components/admin-panel/Breadcrumbs";

// Breadcrumb header shared by the list and add/edit screens. `crumb` adds a
// level after "Users"; `children` are the right-aligned actions.
export default function UsersPageHeader({ title, crumb, children }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div className="min-w-0">
        <Breadcrumbs icon="users" items={crumb ? [{ label: "Users", href: "/admin/users" }, { label: crumb }] : [{ label: "Users" }]} />
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
