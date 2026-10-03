"use client";

import useImageLoaded from "../useImageLoaded";

// Pieces of the order summary shared by the checkout sidebar and the order confirmation.

// One "label ........ value" line of the totals.
export function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 text-[16px] text-[#555555]">
      <dt className="flex items-center gap-1.5">{label}</dt>
      <dd className="text-right font-medium text-[#222222]">{children}</dd>
    </div>
  );
}

// A line's thumbnail: shimmer until the photo arrives, as on the product pages.
export function LineImage({ src }) {
  const { loaded, imageProps } = useImageLoaded();

  if (!src) {
    return (
      <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-[#F5F3EF] p-2 text-center text-[10px] text-gray-400">No image</div>
    );
  }
  return (
    <div className={`h-20 w-20 flex-shrink-0 rounded-lg p-2 ${loaded ? "bg-[#F5F3EF]" : "shimmer"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        {...imageProps}
        src={src}
        alt=""
        className={`h-full w-full object-contain mix-blend-multiply transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
