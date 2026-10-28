"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import StoreIcon from "./icons";
import { CURRENT_NAV_LINK } from "./NavLink";
import { STORE_NAV_LINKS, isCurrentLink, isCurrentPath } from "./navLinks";
import { useSearch } from "./search/SearchProvider";

// Hamburger button + slide-in drawer for < lg screens.
export default function MobileMenu({ customer }) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set());

  function toggleGroup(label) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(label)) next.add(label);
      return next;
    });
  }
  const { openSearch } = useSearch();
  const pathname = usePathname();

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      // A full navigation, so the cart/wishlist providers drop the account's state.
      window.location.assign("/");
    }
  }

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="lg:hidden p-2 -ml-2 hover:text-[#ef9822] transition-colors flex-shrink-0"
      >
        <StoreIcon name="menu" className="w-6 h-6" />
      </button>

      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={`fixed top-0 left-0 h-full w-[280px] bg-white z-50 lg:hidden flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full invisible"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/storefront/logo.png" alt="shopmyband.com" className="h-5 object-contain" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="p-2 hover:text-[#ef9822] transition-colors rounded-full hover:bg-gray-50"
          >
            <StoreIcon name="close" className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex flex-col px-6 pt-8 space-y-6 text-[16px] font-medium tracking-wide uppercase overflow-y-auto">
          {STORE_NAV_LINKS.map((link) => (
            <div key={link.label}>
              <div className="flex items-center justify-between">
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={isCurrentPath(pathname, link.href) ? "page" : isCurrentLink(link, pathname) ? "true" : undefined}
                  className={`hover:text-[#ef9822] transition-colors whitespace-nowrap ${isCurrentLink(link, pathname) ? CURRENT_NAV_LINK : ""}`}
                >
                  {link.label}
                </Link>
                {link.megaMenu && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(link.label)}
                    aria-expanded={expanded.has(link.label)}
                    aria-label={`${expanded.has(link.label) ? "Collapse" : "Expand"} ${link.label}`}
                    className="p-2 -mr-2 hover:text-[#ef9822] transition-colors"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`w-4 h-4 transition-transform duration-200 ${expanded.has(link.label) ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                )}
              </div>
              {/* The mega menu's items, so every category stays reachable without hover. */}
              {link.megaMenu && expanded.has(link.label) && (
                <ul className="mt-3 ml-1 space-y-3 border-l border-gray-100 pl-4 text-[14px] font-normal normal-case tracking-normal text-[#777777]">
                  {link.megaMenu.columns.flat().map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        aria-current={isCurrentPath(pathname, item.href) ? "page" : undefined}
                        className={`hover:text-[#ef9822] transition-colors ${isCurrentPath(pathname, item.href) ? "font-medium text-[#ef9822]" : ""}`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          <div className="h-px bg-gray-100 my-4 w-full" />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              openSearch();
            }}
            className="hover:text-[#ef9822] flex items-center gap-3 transition-colors uppercase"
          >
            <StoreIcon name="search" /> Search
          </button>
          {customer ? (
            <>
              <Link href="/account" onClick={() => setOpen(false)} className="hover:text-[#ef9822] flex items-center gap-3 transition-colors">
                <StoreIcon name="user" /> My Account
              </Link>
              <button
                type="button"
                onClick={signOut}
                disabled={signingOut}
                className="hover:text-red-600 flex items-center gap-3 transition-colors text-left disabled:opacity-50"
              >
                <StoreIcon name="logout" /> {signingOut ? "Logging out…" : "Logout"}
              </button>
            </>
          ) : (
            <Link href="/account" onClick={() => setOpen(false)} className="hover:text-[#ef9822] flex items-center gap-3 transition-colors">
              <StoreIcon name="user" /> Account
            </Link>
          )}
        </nav>
      </div>
    </>
  );
}
