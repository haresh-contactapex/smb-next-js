"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isCurrentPath } from "./navLinks";

// How the header marks the link for the page you're on: the same orange as hover,
// plus an underline so it still reads as "current" while the pointer is elsewhere.
export const CURRENT_NAV_LINK = "text-[#ef9822] underline decoration-2 underline-offset-8";

// A plain header link (no mega menu) that highlights itself on its own page.
export default function NavLink({ href, children }) {
  const current = isCurrentPath(usePathname(), href);

  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`whitespace-nowrap transition-colors hover:text-[#ef9822] ${current ? CURRENT_NAV_LINK : ""}`}
    >
      {children}
    </Link>
  );
}
