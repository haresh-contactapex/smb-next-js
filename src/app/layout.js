import { Inter } from "next/font/google";
import "./globals.css";
import ConditionalShell from "@/components/admin-panel/ConditionalShell";
import ThemeInitScript from "@/components/admin-panel/ThemeInitScript";
import { GeneralSettingsProvider } from "@/components/providers/GeneralSettingsProvider";
import { StaffPermissionsProvider } from "@/components/providers/StaffPermissionsProvider";
import { adminPanelConfig } from "@/config/admin-panel.config";
import { getCurrentStaffUser } from "@/lib/auth/staffSession";
import { roleLabel, initialsFor } from "@/lib/staff";
import { getGeneralSettings } from "@/lib/generalSettings";
import { getCurrencyTaxSettings } from "@/lib/currencyTaxSettings";
import { getProductsSettings } from "@/lib/productsSettings";
import { getSecuritySettings } from "@/lib/securitySettings";
import { getIntegrationsSettings } from "@/lib/integrationsSettings";
import { getAdminRoleBySlug } from "@/lib/adminRoles";
import { filterNavItemsForRole } from "@/lib/routePermissions";
import { effectivePermissions } from "@/lib/permissions";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

export const viewport = {
  colorScheme: "light dark",
};

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

// The store-wide currency lives on Settings -> Currency & Tax (not General)
// — same fallback-to-null treatment as loadGeneralSettings() above.
async function loadCurrencyTaxSettings() {
  try {
    return await getCurrencyTaxSettings();
  } catch {
    return null;
  }
}

// The SKU prefix lives on Settings -> Products — same fallback-to-null
// treatment as loadGeneralSettings() above.
async function loadProductsSettings() {
  try {
    return await getProductsSettings();
  } catch {
    return null;
  }
}

// The reCAPTCHA toggle lives on Settings -> Security — same fallback-to-null
// treatment as loadGeneralSettings() above.
async function loadSecuritySettings() {
  try {
    return await getSecuritySettings();
  } catch {
    return null;
  }
}

// The reCAPTCHA site key lives on Settings -> Integrations — same
// fallback-to-null treatment as loadGeneralSettings() above.
async function loadIntegrationsSettings() {
  try {
    return await getIntegrationsSettings();
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

export default async function RootLayout({ children }) {
  const [staffUser, settings, currencyTaxSettings, productsSettings, securitySettings, integrationsSettings] =
    await Promise.all([
      getCurrentStaffUser(),
      loadGeneralSettings(),
      loadCurrencyTaxSettings(),
      loadProductsSettings(),
      loadSecuritySettings(),
      loadIntegrationsSettings(),
    ]);

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
        navItems: filterNavItemsForRole(adminPanelConfig.navItems, staffRole),
        user: {
          ...adminPanelConfig.user,
          name: staffUser.firstName,
          role: staffRole?.name || roleLabel(staffUser.role),
          initials: initialsFor(staffUser.firstName, staffUser.lastName),
          logoutHref: "/admin/logout",
        },
      }
    : adminPanelConfig;

  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body
        className="bg-slate-50 dark:bg-darkbg text-slate-800 dark:text-slate-200 antialiased"
        suppressHydrationWarning
      >
        <ThemeInitScript />
        <GeneralSettingsProvider
          value={{
            storeName: settings?.storeName,
            logoUrl: settings?.logoUrl,
            faviconUrl: settings?.faviconUrl,
            currency: currencyTaxSettings?.currency,
            skuPrefix: productsSettings?.skuPrefix,
            defaultProductStatus: productsSettings?.defaultStatus,
            defaultWeightUnit: productsSettings?.defaultWeightUnit,
            enableRecaptcha: securitySettings?.enableRecaptcha,
            googleRecaptchaEnabled: integrationsSettings?.googleRecaptchaEnabled,
            googleRecaptchaSiteKey: integrationsSettings?.googleRecaptchaSiteKey,
          }}
        >
          <StaffPermissionsProvider permissions={staffPermissions}>
            <ConditionalShell config={config}>{children}</ConditionalShell>
          </StaffPermissionsProvider>
        </GeneralSettingsProvider>
      </body>
    </html>
  );
}
