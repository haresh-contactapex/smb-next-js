"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import StoreIcon from "../icons";
import { CONTACT_THANKS_STORAGE_KEY } from "./helpers";

// The checkout confirmation's button, reused here for the same look and feel.
const BUTTON =
  "flex w-full items-center justify-center gap-2 rounded-lg bg-[#EF9822] px-6 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-[#D9850F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EF9822]";

// Where the Contact form sends a visitor after a successful submission. `details` (first name,
// email, whether a confirmation copy went out) travels through sessionStorage rather than the
// URL — read once here and removed, so a reload or a shared link shows the generic message
// instead of stale details (the same hand-off checkout uses for its own confirmation page).
export default function ContactThankYou() {
  const headingRef = useRef(null);
  const [details, setDetails] = useState(null);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(CONTACT_THANKS_STORAGE_KEY);
      if (raw) {
        setDetails(JSON.parse(raw));
        window.sessionStorage.removeItem(CONTACT_THANKS_STORAGE_KEY);
      }
    } catch {
      // Storage blocked or the value was malformed: fall back to the generic message below.
    }
    headingRef.current?.focus();
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-1 flex-col items-center px-4 py-16 text-center sm:py-24">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EF9822] text-white">
        <StoreIcon name="check" className="h-8 w-8 [stroke-width:2.5]" />
      </span>

      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-8 font-normal text-[#0f2252] outline-none"
        style={{ fontFamily: "var(--font-playfair), serif", fontSize: "clamp(28px, 3.6vw, 38px)" }}
      >
        {details?.firstName ? `Thank you, ${details.firstName}!` : "Thank you for getting in touch!"}
      </h1>
      <p className="mt-3 max-w-[520px] text-[16px] text-[#555555]">
        We&apos;ve received your message and will reply as soon as we can.
        {details?.confirmationSent && details?.email && (
          <>
            {" "}
            A confirmation has been sent to <span className="font-semibold text-[#333333]">{details.email}</span>.
          </>
        )}
      </p>

      <div className="mt-10 flex w-full max-w-[360px] flex-col gap-3">
        <Link href="/women-wedding-bands" className={BUTTON}>
          Continue shopping
        </Link>
        <Link href="/" className="text-[14px] font-medium text-[#555555] underline underline-offset-2 hover:text-[#333333]">
          Back to home
        </Link>
      </div>
    </div>
  );
}
