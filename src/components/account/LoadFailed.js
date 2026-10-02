import Link from "next/link";
import StoreIcon from "../storefront/icons";
import { BTN_OUTLINE, CARD } from "./accountStyles";

// Shown in place of a whole section when its data couldn't be read. The retry is
// a plain link back to the same page, which makes the server read it again.
export default function LoadFailed({ what, retryHref }) {
  return (
    <div role="alert" className={`${CARD} flex flex-col items-center gap-3 px-6 py-14 text-center`}>
      <StoreIcon name="warning" className="h-10 w-10 text-gray-300" />
      <p className="text-[16px] font-semibold text-[#333333]">We couldn&apos;t load your {what}</p>
      <p className="max-w-sm text-[14px] text-gray-500">Something went wrong on our side. Please try again in a moment.</p>
      <Link href={retryHref} className={`${BTN_OUTLINE} mt-2`}>
        Try again
      </Link>
    </div>
  );
}
