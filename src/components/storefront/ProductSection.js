"use client";

import { useId } from "react";

// Rounded card whose title is a small bordered pill centered on the top edge. Used by the
// product page's "About Item", "Customize" and "Engraving" blocks.
export default function ProductSection({ title, children }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="relative min-w-0 mb-6 rounded-xl border border-gray-200 px-5 pb-5 pt-7">
      <h2
        id={headingId}
        className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-4 py-1 text-[13px] font-medium text-[#333333]"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
