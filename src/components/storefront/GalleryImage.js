"use client";

import useImageLoaded from "./useImageLoaded";

// One product photo tile: shimmer until the image arrives. Clicking it opens
// the photo in the lightbox.
export default function GalleryImage({ src, alt, label, onOpen, eager = false, className = "" }) {
  const { loaded, imageProps } = useImageLoaded();

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={label}
      aria-haspopup="dialog"
      className={`group w-full cursor-zoom-in rounded-md aspect-[4/3] flex items-center justify-center p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef9822] ${loaded ? "bg-[#F8F8F8]" : "shimmer"} ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        {...imageProps}
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        className={`w-[80%] h-[80%] object-contain mix-blend-multiply transition duration-500 group-hover:scale-105 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </button>
  );
}
