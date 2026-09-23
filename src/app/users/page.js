import UsersListing from "@/components/users/UsersListing";
import UsersNotice from "@/components/users/UsersNotice";
import { requireStaffPermission } from "@/lib/auth/staffPermissions";
import { listStaffUsers, StaffUserError } from "@/lib/staffUsers";
import { listAdminRoles, AdminRoleError } from "@/lib/adminRoles";
import { roleHasPermission } from "@/lib/permissions";

export const metadata = {
  title: "All Users · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

export default async function AllUsersPage({ searchParams }) {
  const auth = await requireStaffPermission("users.view");
  if (!auth.ok) return <UsersNotice status={auth.status} message={auth.error} />;

  const { saved } = (await searchParams) || {};

  try {
    const [users, roles] = await Promise.all([listStaffUsers(), listAdminRoles()]);
    return (
      <UsersListing
        users={users}
        roles={roles.map(({ slug, name }) => ({ slug, name }))}
        permissions={{
          canCreate: roleHasPermission(auth.role, "users.create"),
          canEdit: roleHasPermission(auth.role, "users.edit"),
          canDelete: roleHasPermission(auth.role, "users.delete"),
        }}
        currentUserId={auth.user.id}
        actorFullAccess={Boolean(auth.role.fullAccess)}
        saved={typeof saved === "string" ? saved : undefined}
      />
    );
  } catch (error) {
    const status = error instanceof StaffUserError || error instanceof AdminRoleError ? error.status : 500;
    return <UsersNotice status={status} message={error.message} />;
  }
}
