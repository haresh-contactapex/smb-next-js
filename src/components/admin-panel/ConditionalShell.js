"use client";

import { usePathname } from "next/navigation";
import AdminLayout from "./AdminLayout";

// The admin panel's own standalone auth pages (kept in sync with middleware's
// PUBLIC_PATHS). Customer auth pages and the storefront sit outside /admin.
const STANDALONE_ROUTES = [
  "/admin/login",
  "/admin/logout",
  "/admin/forgot-password",
  "/admin/reset-password",
];

/**
 * Standalone routes (auth pages) render without the sidebar/header/footer shell;
 * everything else under /admin gets the full AdminLayout. Gated on pathname so the
 * admin layout can stay a server component.
 */
export default function ConditionalShell({ config, children }) {
  const pathname = usePathname();

  if (STANDALONE_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  return <AdminLayout config={config}>{children}</AdminLayout>;
}
