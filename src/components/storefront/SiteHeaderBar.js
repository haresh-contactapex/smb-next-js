"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import MobileMenu from "./MobileMenu";
import NavLink from "./NavLink";
import NavMegaMenu from "./NavMegaMenu";
import CartButton from "./cart/CartButton";
import WishlistButton from "./wishlist/WishlistButton";
import SearchButton from "./search/SearchButton";
import StoreIcon from "./icons";

const iconButton = "hover:text-[#ef9822] transition-colors hover:scale-110 transform duration-300";
// Matches NavMegaMenu's close delay so a quick diagonal mouse move from the
// icon to the panel doesn't close it mid-transit.
const CLOSE_DELAY_MS = 150;

// Rounded top corners + a negative top margin let the header rise up into the
// announcement bar above it (see TopBar) while the page is scrolled to the top.
// Once the header actually sticks flush to the viewport's top edge, that same
// rounding would just cut a peephole into whatever page content has scrolled in
// behind it, so it's dropped the moment the header is truly stuck.
export default function SiteHeaderBar({ navLinks, customer }) {
  const headerRef = useRef(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    function checkStuck() {
      const node = headerRef.current;
      if (node) setStuck(node.getBoundingClientRect().top <= 0);
    }
    checkStuck();
    window.addEventListener("scroll", checkStuck, { passive: true });
    window.addEventListener("resize", checkStuck);
    return () => {
      window.removeEventListener("scroll", checkStuck);
      window.removeEventListener("resize", checkStuck);
    };
  }, []);

  return (
    <header
      ref={headerRef}
      // The negative margin stays constant regardless of `stuck`: it only ever
      // affects the *natural* (pre-stuck) flow position, which is what decides when
      // sticky engages. Toggling it here would move that threshold every time
      // `stuck` flips, feeding back into the very measurement that sets it and
      // making the header (and the whole page) judder at the scroll boundary.
      // The border/shadow only belong to the stuck (flush, no curve) state: while
      // curved, that straight line cut across the rounded corner's white reveal.
      className={`sticky top-0 -mt-[70px] sm:-mt-[107px] z-[22] bg-white transition-[border-radius] duration-150 ${
        stuck ? "rounded-t-none border-b border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.05)]" : "rounded-t-[32px] sm:rounded-t-[50px]"
      }`}
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between gap-3 lg:gap-4 xl:gap-8">
        <MobileMenu customer={customer} />

        <Link href="/" className="flex-1 lg:flex-none flex justify-center lg:justify-start flex-shrink-0" aria-label="shopmyband.com home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/storefront/logo.png" alt="shopmyband.com" className="h-6 sm:h-7 lg:h-6 xl:h-7 2xl:h-8 object-contain" />
        </Link>

        <nav aria-label="Main" className="hidden lg:flex lg:space-x-3 xl:space-x-6 2xl:space-x-8 lg:text-[11px] xl:text-[13px] 2xl:text-[16px] font-medium tracking-wide uppercase flex-shrink">
          {navLinks.map((link) =>
            link.megaMenu ? (
              <NavMegaMenu key={link.label} link={link} />
            ) : (
              <NavLink key={link.label} href={link.href}>
                {link.label}
              </NavLink>
            ),
          )}
        </nav>

        <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-3 xl:space-x-5 2xl:space-x-6 text-[#555555] flex-shrink-0">
          <SearchButton className={`hidden sm:block ${iconButton}`} />
          <AccountMenu customer={customer} className="hidden sm:block" />
          <WishlistButton className={iconButton} />
          <CartButton className={iconButton} />
        </div>
      </div>
    </header>
  );
}

// Signed-out visitors get a plain link that sends them on to sign in, then
// brings them back to their account. Signed-in customers get a small dropdown
// instead, since the icon alone can no longer just mean "go to /account".
function AccountMenu({ customer, className = "" }) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const wrapperRef = useRef(null);
  const closeTimer = useRef(null);

  const cancelClose = useCallback(() => {
    clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  const openMenu = useCallback(() => {
    cancelClose();
    setOpen(true);
  }, [cancelClose]);

  const closeSoon = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }, [cancelClose]);

  useEffect(() => cancelClose, [cancelClose]);

  if (!customer) {
    return (
      <Link href="/account" aria-label="My account" className={`${iconButton} ${className}`}>
        <StoreIcon name="user" />
      </Link>
    );
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      // A full navigation, so the cart/wishlist providers drop the account's state.
      window.location.assign("/");
    }
  }

  function handleBlur(event) {
    if (!wrapperRef.current?.contains(event.relatedTarget)) {
      cancelClose();
      setOpen(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      cancelClose();
      setOpen(false);
    }
  }

  return (
    <div
      ref={wrapperRef}
      className={`relative ${className}`}
      onMouseEnter={openMenu}
      onMouseLeave={closeSoon}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Account menu"
        className={`relative ${iconButton} ${
          // Bridges the gap to the panel below while open, so a diagonal mouse
          // move off the icon doesn't cross dead space and trigger a close.
          open ? "after:absolute after:inset-x-0 after:top-full after:h-4" : ""
        }`}
      >
        <StoreIcon name="user" />
      </button>

      <div
        className={`absolute right-0 top-[calc(100%+14px)] z-10 w-44 rounded-xl border border-[#e9e9e9] bg-white py-1.5 text-[14px] font-medium text-[#333333] shadow-[0_18px_45px_rgba(0,0,0,0.10)] transition duration-150 ease-out ${
          open ? "visible translate-y-0 opacity-100" : "pointer-events-none invisible translate-y-1 opacity-0"
        }`}
      >
        <Link
          href="/account"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#FAFAFA] hover:text-[#ef9822] transition-colors"
        >
          <StoreIcon name="user" className="h-4 w-4" /> My Account
        </Link>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left hover:bg-[#FAFAFA] hover:text-red-600 transition-colors disabled:opacity-50"
        >
          <StoreIcon name="logout" className="h-4 w-4" /> {signingOut ? "Logging out…" : "Logout"}
        </button>
      </div>
    </div>
  );
}
