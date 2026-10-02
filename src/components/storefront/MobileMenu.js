"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StoreIcon from "./icons";
import { STORE_NAV_LINKS } from "./navLinks";
import { useSearch } from "./search/SearchProvider";

// Hamburger button + slide-in drawer for < lg screens.
export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const { openSearch } = useSearch();

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
            <Link key={link.label} href={link.href} onClick={() => setOpen(false)} className="hover:text-[#ef9822] transition-colors whitespace-nowrap">
              {link.label}
            </Link>
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
          <Link href="/login" onClick={() => setOpen(false)} className="hover:text-[#ef9822] flex items-center gap-3 transition-colors">
            <StoreIcon name="user" /> Account
          </Link>
        </nav>
      </div>
    </>
  );
}
