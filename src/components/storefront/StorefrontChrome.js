"use client";

import { usePathname } from "next/navigation";

// Routes that bring their own header and footer, so the storefront's (the
// announcement bar, navigation and footer) is left out.
const STANDALONE_PATHS = ["/checkout"];

// Places the storefront header and footer around the page, except on the
// standalone routes above. They are passed in as elements so they stay server
// components.
export default function StorefrontChrome({ header, footer, children }) {
  const pathname = usePathname() || "";
  const standalone = STANDALONE_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  return (
    <>
      {!standalone && header}
      <main className="flex-1 bg-white">{children}</main>
      {!standalone && footer}
    </>
  );
}
