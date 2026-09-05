"use client";

import { usePathname } from "next/navigation";
import AdminLayout from "./AdminLayout";

const STANDALONE_ROUTES = ["/login", "/register", "/forgot-password"];

/**
 * Standalone routes (auth pages) render without the sidebar/header/footer shell;
 * everything else gets the full AdminLayout. Gated on pathname so the root layout
 * can stay a server component while still sharing one <body>/theme-init script.
 */
export default function ConditionalShell({ config, children }) {
  const pathname = usePathname();

  if (STANDALONE_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  return <AdminLayout config={config}>{children}</AdminLayout>;
}
