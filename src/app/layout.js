import { Inter } from "next/font/google";
import "./globals.css";
import ConditionalShell from "@/components/admin-panel/ConditionalShell";
import ThemeInitScript from "@/components/admin-panel/ThemeInitScript";
import { adminPanelConfig } from "@/config/admin-panel.config";
import { getCurrentStaffUser } from "@/lib/auth/staffSession";
import { roleLabel, initialsFor } from "@/lib/staff";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

export const metadata = {
  title: "Shop My Band — Admin Dashboard",
  description: "Admin dashboard for Shop My Band",
};

export const viewport = {
  colorScheme: "light dark",
};

export default async function RootLayout({ children }) {
  const staffUser = await getCurrentStaffUser();

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
        <ConditionalShell config={config}>{children}</ConditionalShell>
      </body>
    </html>
  );
}
