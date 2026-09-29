import ConditionalShell from "@/components/admin-panel/ConditionalShell";
import { StaffPermissionsProvider } from "@/components/providers/StaffPermissionsProvider";
import { adminPanelConfig } from "@/config/admin-panel.config";
import { getCurrentStaffUser } from "@/lib/auth/staffSession";
import { roleLabel, initialsFor } from "@/lib/staff";
import { getGeneralSettings } from "@/lib/generalSettings";
import { getAdminRoleBySlug } from "@/lib/adminRoles";
import { filterNavItemsForRole } from "@/lib/routePermissions";
import { effectivePermissions } from "@/lib/permissions";
import { getOrderStatusCounts, withOrderNavCounts } from "@/lib/orders";

// The DB row may not exist yet (e.g. a fresh environment before the
// general_settings migration/seed has run) — fall back to the static
// defaults rather than letting every page fail to render.
async function loadGeneralSettings() {
  try {
    return await getGeneralSettings();
  } catch {
    return null;
  }
}

// Live per-status order counts shown as sidebar badges — same fallback-to-null
// treatment as loadGeneralSettings() above (e.g. before db:migrate:orders runs).
async function loadOrderStatusCounts() {
  try {
    return await getOrderStatusCounts();
  } catch {
    return null;
  }
}

// The signed-in staff member's role, used to hide sidebar entries they can't
// open. null (no role row / table not migrated / DB hiccup) hides every
// permission-gated entry, matching what middleware would allow.
async function loadStaffRole(staffUser) {
  if (!staffUser) return null;
  try {
    return await getAdminRoleBySlug(staffUser.role);
  } catch {
    return null;
  }
}

export async function generateMetadata() {
  const settings = await loadGeneralSettings();
  return {
    title: settings?.storeName ? `${settings.storeName} — Admin Dashboard` : "Shop My Band — Admin Dashboard",
    description: settings?.storeName ? `Admin dashboard for ${settings.storeName}` : "Admin dashboard for Shop My Band",
    ...(settings?.faviconUrl ? { icons: { icon: settings.faviconUrl } } : {}),
  };
}

// Everything under /admin: the staff session, role-filtered sidebar and the
// admin shell. The storefront and customer auth pages live outside this layout.
export default async function AdminRootLayout({ children }) {
  const [staffUser, orderCounts] = await Promise.all([getCurrentStaffUser(), loadOrderStatusCounts()]);

  const staffRole = await loadStaffRole(staffUser);
  // What the role may do, for hiding controls client-side (null = no staff
  // session, e.g. the login page). An inactive or missing role grants nothing.
  const staffPermissions = staffUser
    ? staffRole?.status === "active"
      ? effectivePermissions(staffRole)
      : []
    : null;

  const config = staffUser
    ? {
        ...adminPanelConfig,
        navItems: withOrderNavCounts(filterNavItemsForRole(adminPanelConfig.navItems, staffRole), orderCounts),
        user: {
          ...adminPanelConfig.user,
          name: staffUser.firstName,
          role: staffRole?.name || roleLabel(staffUser.role),
          initials: initialsFor(staffUser.firstName, staffUser.lastName),
          logoutHref: "/admin/logout",
        },
      }
    : { ...adminPanelConfig, navItems: withOrderNavCounts(adminPanelConfig.navItems, orderCounts) };

  return (
    <StaffPermissionsProvider permissions={staffPermissions}>
      <ConditionalShell config={config}>{children}</ConditionalShell>
    </StaffPermissionsProvider>
  );
}
