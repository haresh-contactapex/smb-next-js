"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Breadcrumb from "../storefront/Breadcrumb";
import StoreIcon from "../storefront/icons";
import { ACCOUNT_NAV, accountBreadcrumbs, fullNameOf, initialsOf, navItemForPath, tierLabel } from "./accountHelpers";
import { CARD, HEADING_FONT } from "./accountStyles";

// Frame around every /account page: breadcrumb, the signed-in customer's card
// with the section menu (a sidebar on large screens, a scrolling pill row on
// small ones), and the page itself. The customer comes from the server layout,
// which has already confirmed there is a session.
export default function AccountShell({ customer, children }) {
  const pathname = usePathname();
  const current = navItemForPath(pathname);
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      // A full navigation, so the cart/wishlist providers drop the account's state.
      window.location.assign("/");
    }
  }

  return (
    <>
      <Breadcrumb items={accountBreadcrumbs(pathname)} className="max-w-[1280px] text-[15px]" />

      <div className="mx-auto grid max-w-[1280px] grid-cols-[minmax(0,1fr)] gap-6 px-4 pb-16 sm:px-8 lg:grid-cols-[272px_minmax(0,1fr)] lg:gap-10">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          {/* On a phone the page itself comes first; tier and points are on Overview and Profile. */}
          <div className={`${CARD} hidden p-5 lg:block`}>
            <div className="flex items-center gap-3.5">
              <span
                aria-hidden="true"
                className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-full bg-[#4A4A4A] text-[17px] font-semibold tracking-wide text-white"
                style={HEADING_FONT}
              >
                {initialsOf(customer)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[16px] font-semibold text-[#333333]">{fullNameOf(customer)}</p>
                <p className="truncate text-[13px] text-gray-500" title={customer.email}>
                  {customer.email}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-lg bg-[#FAFAFA] px-3.5 py-2.5 text-[13px]">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#333333]">
                <StoreIcon name="star" className="h-4 w-4 text-[#ef9822]" />
                {tierLabel(customer.customerGroup)}
              </span>
              <span className="text-gray-500">
                <span className="font-semibold text-[#333333]">{customer.loyaltyPoints.toLocaleString("en-US")}</span> points
              </span>
            </div>
          </div>

          <nav aria-label="Account sections" className="-mx-4 mt-4 overflow-x-auto px-4 sm:-mx-8 sm:px-8 lg:mx-0 lg:overflow-visible lg:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <ul className="flex gap-2 lg:flex-col lg:gap-1">
              {ACCOUNT_NAV.map((item) => {
                const active = current?.id === item.id;
                return (
                  <li key={item.id} className="flex-shrink-0">
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3.5 py-2.5 text-[14px] font-medium transition-colors lg:py-3 ${
                        active ? "bg-[#4A4A4A] text-white" : "bg-white text-[#555555] ring-1 ring-inset ring-gray-200 hover:text-[#ef9822] lg:bg-transparent lg:ring-0 lg:hover:bg-[#FAFAFA]"
                      }`}
                    >
                      <StoreIcon name={item.icon} className="h-[18px] w-[18px]" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
              <li className="hidden lg:block">
                <button
                  type="button"
                  onClick={signOut}
                  disabled={signingOut}
                  className="mt-2 flex w-full items-center gap-2.5 rounded-lg border-t border-gray-100 px-3.5 py-3 pt-4 text-left text-[14px] font-medium text-gray-500 transition-colors hover:text-red-600 disabled:opacity-50"
                >
                  <StoreIcon name="logout" className="h-[18px] w-[18px]" />
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              </li>
            </ul>
          </nav>
        </aside>

        <div className="min-w-0">{children}</div>

        <div className="lg:hidden">
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-[14px] font-medium text-gray-500 transition-colors hover:text-red-600 disabled:opacity-50"
          >
            <StoreIcon name="logout" className="h-[18px] w-[18px]" />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>
    </>
  );
}
