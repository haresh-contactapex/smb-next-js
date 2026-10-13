"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import MobileMenu from "./MobileMenu";
import NavLink from "./NavLink";
import NavMegaMenu from "./NavMegaMenu";
import CartButton from "./cart/CartButton";
import WishlistButton from "./wishlist/WishlistButton";
import SearchButton from "./search/SearchButton";
import StoreIcon from "./icons";

const iconButton = "hover:text-[#ef9822] transition-colors hover:scale-110 transform duration-300";

// Rounded top corners + a negative top margin let the header rise up into the
// announcement bar above it (see TopBar) while the page is scrolled to the top.
// Once the header actually sticks flush to the viewport's top edge, that same
// rounding would just cut a peephole into whatever page content has scrolled in
// behind it, so it's dropped the moment the header is truly stuck.
export default function SiteHeaderBar({ navLinks }) {
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
        <MobileMenu />

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
          {/* Signed-out visitors are sent on to sign in, then brought back to their account. */}
          <Link href="/account" aria-label="My account" className={`hidden sm:block ${iconButton}`}>
            <StoreIcon name="user" />
          </Link>
          <WishlistButton className={iconButton} />
          <CartButton className={iconButton} />
        </div>
      </div>
    </header>
  );
}
