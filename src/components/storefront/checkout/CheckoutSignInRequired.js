import Link from "next/link";
import StoreIcon from "../icons";
import { CHECKOUT_CARD } from "./checkoutStyles";

const BUTTON =
  "flex w-full items-center justify-center rounded-lg px-6 py-4 text-[16px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4920a]";

// Shown instead of the checkout when Settings -> Checkout -> Allow guest checkout is
// off and the visitor isn't signed in. Both links come back to the checkout, and the
// cart lives in the browser, so nothing is lost on the way.
export default function CheckoutSignInRequired() {
  const next = encodeURIComponent("/checkout");
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16 sm:py-24">
      <div className={`${CHECKOUT_CARD} w-full max-w-[460px] p-8 text-center sm:p-10`}>
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF4E3] text-[#d4920a]">
          <StoreIcon name="lockClosed" className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-[22px] font-semibold text-[#222222]">Sign in to check out</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[#555555]">
          Please sign in or create an account to place your order. Your cart is saved and will be waiting for you.
        </p>
        <div className="mt-7 space-y-3">
          <Link href={`/login?next=${next}`} className={`${BUTTON} bg-[#d4920a] text-white hover:bg-[#b87c06]`}>
            Sign in
          </Link>
          <Link href={`/register?next=${next}`} className={`${BUTTON} border border-[#E4E4E4] bg-white text-[#333333] hover:border-[#d4920a]`}>
            Create an account
          </Link>
        </div>
        <Link href="/cart" className="mt-5 inline-block text-[14px] text-[#555555] underline transition-colors hover:text-[#d4920a]">
          Back to cart
        </Link>
      </div>
    </div>
  );
}
