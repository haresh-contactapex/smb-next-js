import RoleForm from "@/components/settings-admin-roles/RoleForm";
import RolesNotice from "@/components/settings-admin-roles/RolesNotice";
import { requireStaffPermission } from "@/lib/auth/staffPermissions";
import { MANAGE_ROLES_PERMISSION } from "@/lib/permissions";

export const metadata = {
  title: "Add New Role · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

export default async function NewAdminRolePage() {
  const auth = await requireStaffPermission(MANAGE_ROLES_PERMISSION);
  if (!auth.ok) return <RolesNotice status={auth.status} message={auth.error} backHref="/settings/admin-roles" />;

  return <RoleForm />;
}
