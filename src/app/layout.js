import { Inter } from "next/font/google";
import "./globals.css";
import ConditionalShell from "@/components/admin-panel/ConditionalShell";
import ThemeInitScript from "@/components/admin-panel/ThemeInitScript";
import { GeneralSettingsProvider } from "@/components/providers/GeneralSettingsProvider";
import { adminPanelConfig } from "@/config/admin-panel.config";
import { getCurrentStaffUser } from "@/lib/auth/staffSession";
import { roleLabel, initialsFor } from "@/lib/staff";
import { getGeneralSettings } from "@/lib/generalSettings";

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

export async function generateMetadata() {
  const settings = await loadGeneralSettings();
  return {
    title: settings?.storeName ? `${settings.storeName} — Admin Dashboard` : "Shop My Band — Admin Dashboard",
    description: settings?.storeName ? `Admin dashboard for ${settings.storeName}` : "Admin dashboard for Shop My Band",
    ...(settings?.faviconUrl ? { icons: { icon: settings.faviconUrl } } : {}),
  };
}

export default async function RootLayout({ children }) {
  const [staffUser, settings] = await Promise.all([getCurrentStaffUser(), loadGeneralSettings()]);

  const config = staffUser
    ? {
        ...adminPanelConfig,
        user: {
          ...adminPanelConfig.user,
          name: staffUser.firstName,
          role: roleLabel(staffUser.role),
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
            currency: settings?.currency,
          }}
        >
          <ConditionalShell config={config}>{children}</ConditionalShell>
        </GeneralSettingsProvider>
      </body>
    </html>
  );
}
