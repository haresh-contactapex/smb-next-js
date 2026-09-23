import RoleForm from "@/components/settings-admin-roles/RoleForm";
import RolesNotice from "@/components/settings-admin-roles/RolesNotice";
import { requireStaffPermission } from "@/lib/auth/staffPermissions";
import { getAdminRoleById, AdminRoleError } from "@/lib/adminRoles";
import { MANAGE_ROLES_PERMISSION } from "@/lib/permissions";

export const metadata = {
  title: "Edit Role · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

export default async function EditAdminRolePage({ params, searchParams }) {
  const auth = await requireStaffPermission(MANAGE_ROLES_PERMISSION);
  if (!auth.ok) return <RolesNotice status={auth.status} message={auth.error} backHref="/settings/admin-roles" />;

  const { id } = await params;
  const { saved } = (await searchParams) || {};

  try {
    const role = await getAdminRoleById(id);
    if (!role) return <RolesNotice status={404} backHref="/settings/admin-roles" />;
    return <RoleForm role={role} saved={typeof saved === "string" ? saved : undefined} />;
  } catch (error) {
    const status = error instanceof AdminRoleError ? error.status : 500;
    return <RolesNotice status={status} message={error.message} backHref="/settings/admin-roles" />;
  }
}
