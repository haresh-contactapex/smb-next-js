import Link from "next/link";
import StoreIcon from "../icons";

// The checkout's own header: just the logo and a reassurance, no store
// navigation to wander off with. The regular storefront header is hidden on
// this route by StorefrontChrome.
export default function CheckoutHeader() {
  return (
    <header className="border-b border-[#EFEFEF] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-4 sm:px-8 sm:py-5">
        <Link href="/" aria-label="shopmyband.com home" className="flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/storefront/logo.png" alt="shopmyband.com" className="h-5 object-contain sm:h-7" />
        </Link>
        <p className="flex items-center gap-1.5 whitespace-nowrap text-[13px] text-[#555555] sm:gap-2 sm:text-[14px]">
          <StoreIcon name="lockClosed" className="h-5 w-5 text-[#9E9E9E] sm:h-6 sm:w-6" />
          Secure Checkout
        </p>
      </div>
    </header>
  );
}
