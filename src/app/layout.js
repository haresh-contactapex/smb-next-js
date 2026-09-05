import { Inter } from "next/font/google";
import "./globals.css";
import ConditionalShell from "@/components/admin-panel/ConditionalShell";
import ThemeInitScript from "@/components/admin-panel/ThemeInitScript";
import { adminPanelConfig } from "@/config/admin-panel.config";

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

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body
        className="bg-slate-50 dark:bg-darkbg text-slate-800 dark:text-slate-200 antialiased"
        suppressHydrationWarning
      >
        <ThemeInitScript />
        <ConditionalShell config={adminPanelConfig}>{children}</ConditionalShell>
      </body>
    </html>
  );
}
