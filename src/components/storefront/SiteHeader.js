import Link from "next/link";
import MobileMenu from "./MobileMenu";
import NavLink from "./NavLink";
import NavMegaMenu from "./NavMegaMenu";
import CartButton from "./cart/CartButton";
import WishlistButton from "./wishlist/WishlistButton";
import SearchButton from "./search/SearchButton";
import StoreIcon from "./icons";
import { STORE_NAV_LINKS } from "./navLinks";

// Storefront header: white bar with a hairline border + soft shadow so it
// reads as its own region above the page content.
export default function SiteHeader() {
  const iconButton = "hover:text-[#ef9822] transition-colors hover:scale-110 transform duration-300";

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between gap-3 lg:gap-4 xl:gap-8">
        <MobileMenu />

        <Link href="/" className="flex-1 lg:flex-none flex justify-center lg:justify-start flex-shrink-0" aria-label="shopmyband.com home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/storefront/logo.png" alt="shopmyband.com" className="h-6 sm:h-7 lg:h-6 xl:h-7 2xl:h-8 object-contain" />
        </Link>

        <nav aria-label="Main" className="hidden lg:flex lg:space-x-3 xl:space-x-6 2xl:space-x-8 lg:text-[11px] xl:text-[13px] 2xl:text-[16px] font-medium tracking-wide uppercase flex-shrink">
          {STORE_NAV_LINKS.map((link) =>
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
