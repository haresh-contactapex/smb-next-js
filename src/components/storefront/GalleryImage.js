"use client";

import useImageLoaded from "./useImageLoaded";

// One product photo tile: shimmer until the image arrives.
export default function GalleryImage({ src, alt, eager = false, className = "" }) {
  const { loaded, imageProps } = useImageLoaded();

  return (
    <div className={`rounded-md aspect-[4/3] flex items-center justify-center p-4 ${loaded ? "bg-[#F8F8F8]" : "shimmer"} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        {...imageProps}
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        className={`w-[80%] h-[80%] object-contain mix-blend-multiply transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
