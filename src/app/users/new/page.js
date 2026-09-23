import UserForm from "@/components/users/UserForm";
import UsersNotice from "@/components/users/UsersNotice";
import { requireStaffPermission } from "@/lib/auth/staffPermissions";
import { listAdminRoles, AdminRoleError } from "@/lib/adminRoles";

export const metadata = {
  title: "Add User · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

export default async function NewUserPage() {
  const auth = await requireStaffPermission("users.create");
  if (!auth.ok) return <UsersNotice status={auth.status} message={auth.error} backHref="/users" />;

  try {
    const roles = await listAdminRoles();
    return <UserForm roles={roles} currentUserId={auth.user.id} actorFullAccess={Boolean(auth.role.fullAccess)} />;
  } catch (error) {
    const status = error instanceof AdminRoleError ? error.status : 500;
    return <UsersNotice status={status} message={error.message} backHref="/users" />;
  }
}
