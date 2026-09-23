import UserForm from "@/components/users/UserForm";
import UsersNotice from "@/components/users/UsersNotice";
import { requireStaffPermission } from "@/lib/auth/staffPermissions";
import { getStaffUserById, StaffUserError } from "@/lib/staffUsers";
import { listAdminRoles, AdminRoleError } from "@/lib/adminRoles";
import { roleHasPermission } from "@/lib/permissions";

export const metadata = {
  title: "Edit User · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

export default async function EditUserPage({ params }) {
  const auth = await requireStaffPermission("users.edit");
  if (!auth.ok) return <UsersNotice status={auth.status} message={auth.error} backHref="/users" />;

  const { id } = await params;

  try {
    const [user, roles] = await Promise.all([getStaffUserById(id), listAdminRoles()]);
    if (!user) return <UsersNotice status={404} backHref="/users" />;

    const actorFullAccess = Boolean(auth.role.fullAccess);
    if (user.roleFullAccess && !actorFullAccess && user.id !== auth.user.id) {
      return <UsersNotice status={403} backHref="/users" />;
    }

    return (
      <UserForm
        user={user}
        roles={roles}
        currentUserId={auth.user.id}
        actorFullAccess={actorFullAccess}
        canDelete={roleHasPermission(auth.role, "users.delete")}
      />
    );
  } catch (error) {
    const status = error instanceof StaffUserError || error instanceof AdminRoleError ? error.status : 500;
    return <UsersNotice status={status} message={error.message} backHref="/users" />;
  }
}
