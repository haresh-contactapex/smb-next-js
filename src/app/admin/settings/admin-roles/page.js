import RolesListing from "@/components/settings-admin-roles/RolesListing";
import RolesNotice from "@/components/settings-admin-roles/RolesNotice";
import { requireStaffPermission } from "@/lib/auth/staffPermissions";
import { listAdminRoles, AdminRoleError } from "@/lib/adminRoles";
import { MANAGE_ROLES_PERMISSION } from "@/lib/permissions";

export const metadata = {
  title: "Roles & Permissions · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminRolesSettingsPage() {
  const auth = await requireStaffPermission(MANAGE_ROLES_PERMISSION);
  if (!auth.ok) return <RolesNotice status={auth.status} message={auth.error} />;

  try {
    const roles = await listAdminRoles();
    return <RolesListing roles={roles} />;
  } catch (error) {
    return <RolesNotice status={error instanceof AdminRoleError ? error.status : 500} message={error.message} />;
  }
}
