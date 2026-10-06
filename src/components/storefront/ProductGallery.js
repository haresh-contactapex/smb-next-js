"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import StoreIcon from "./icons";
import ImageLightbox, { imageAlt } from "./ImageLightbox";
import useImageLoaded from "./useImageLoaded";
import { galleryPhotos } from "./galleryImages";
import { useVariantImage } from "./VariantImageProvider";

const FOCUS_RING = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ef9822]";

const ARROW = `absolute top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded bg-white/90 text-[#333333] shadow transition-colors hover:bg-white hover:text-[#ef9822] ${FOCUS_RING}`;

// One small preview in the strip beside the main image.
function Thumb({ src, label, selected, onSelect }) {
  const { loaded, imageProps } = useImageLoaded();
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={label}
      aria-current={selected ? "true" : undefined}
      className={`block h-16 w-16 overflow-hidden rounded-sm border transition-colors sm:h-[72px] sm:w-[72px] xl:h-24 xl:w-24 ${
        selected ? "border-[#1c3b6a]" : "border-transparent hover:border-gray-300"
      } ${loaded ? "bg-[#F8F8F8]" : "shimmer"} ${FOCUS_RING}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        {...imageProps}
        src={src}
        alt=""
        className={`h-full w-full object-contain p-1.5 mix-blend-multiply transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </button>
  );
}

// The large photo. Keyed by its source so each photo gets its own loading shimmer.
function MainPhoto({ src, alt }) {
  const { loaded, imageProps } = useImageLoaded();
  return (
    <span className={`absolute inset-0 flex items-center justify-center ${loaded ? "bg-[#F8F8F8]" : "shimmer"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        {...imageProps}
        src={src}
        alt={alt}
        className={`h-[88%] w-[88%] object-contain mix-blend-multiply transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </span>
  );
}

// Product photos: a vertical strip of thumbnails on the left (a row under the
// image on phones) and a large main image. The main image is the selected
// variant's own photo; picking a thumbnail, the arrows or a photo in the viewer
// shows another one until the shopper next changes a color or size, which
// brings the variant's photo back. Clicking the image opens the lightbox on it.
export default function ProductGallery({ images, variantImages = [], title, lightboxClassName = "" }) {
  const { variantImage, variantKey } = useVariantImage();
  const photos = useMemo(() => galleryPhotos(images, variantImages), [images, variantImages]);

  // A manual pick lasts only until the shopper changes any color or size (a new
  // variant), even when the new variant happens to use the same photo.
  const [chosen, setChosen] = useState(null);
  const manual = chosen && chosen.variantKey === variantKey ? chosen.url : null;
  const current = manual ?? variantImage ?? photos[0] ?? null;
  const index = Math.max(0, photos.indexOf(current));
  const choose = useCallback((url) => setChosen({ url, variantKey }), [variantKey]);
  const go = (step) => choose(photos[(index + step + photos.length) % photos.length]);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  // The "+" marker that stands in for the pointer over the main image.
  const markerRef = useRef(null);
  function followPointer(event) {
    const box = event.currentTarget.getBoundingClientRect();
    if (markerRef.current) markerRef.current.style.transform = `translate(${event.clientX - box.left}px, ${event.clientY - box.top}px)`;
  }

  // Keep the selected thumbnail in view by scrolling the strip itself, never the page.
  const listRef = useRef(null);
  useEffect(() => {
    const list = listRef.current;
    const thumb = list?.querySelector('[aria-current="true"]');
    if (!list || !thumb) return;
    const { offsetTop: top, offsetLeft: left, offsetHeight: height, offsetWidth: width } = thumb;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (top + height > list.scrollTop + list.clientHeight) list.scrollTop = top + height - list.clientHeight;
    if (left < list.scrollLeft) list.scrollLeft = left;
    else if (left + width > list.scrollLeft + list.clientWidth) list.scrollLeft = left + width - list.clientWidth;
  }, [current]);

  if (!current) {
    return (
      <div className="w-full lg:w-[55%]">
        <div className="bg-[#F8F8F8] rounded-md aspect-[4/3] flex items-center justify-center text-sm text-gray-400">
          No image available
        </div>
      </div>
    );
  }

  const several = photos.length > 1;

  return (
    // self-start: size to the photos, not to the (usually taller) details column beside it.
    // On desktop the photos stay pinned just under the sticky header (top-24 clears its
    // ~70px) while the details column scrolls past; they leave with that column's end.
    <div className="flex w-full flex-col-reverse gap-3 self-start sm:flex-row sm:gap-4 lg:sticky lg:top-24 lg:w-[55%] xl:gap-5">
      {several && (
        <div className="relative shrink-0 sm:w-[72px] xl:w-24">
          <ul
            ref={listRef}
            aria-label="Product photos"
            className="relative flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin] sm:absolute sm:inset-0 sm:flex-col sm:overflow-x-hidden sm:overflow-y-auto sm:pb-0"
          >
            {photos.map((src, i) => (
              <li key={src} className="shrink-0">
                <Thumb src={src} label={`Show image ${i + 1} of ${photos.length}`} selected={src === current} onSelect={() => choose(src)} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="relative min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          onMouseMove={followPointer}
          aria-label={several ? `View image ${index + 1} of ${photos.length} larger` : "View image larger"}
          aria-haspopup="dialog"
          className={`group relative block aspect-square w-full overflow-hidden rounded-md lg:max-h-[calc(100vh-8rem)] [@media(hover:hover)]:cursor-none ${FOCUS_RING}`}
        >
          <MainPhoto key={current} src={current} alt={imageAlt(title, index)} />
          <span
            ref={markerRef}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 z-10 -ml-5 -mt-5 hidden h-10 w-10 items-center justify-center rounded-full bg-white text-[#333333] opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 [@media(hover:hover)]:flex"
          >
            <StoreIcon name="plus" className="h-5 w-5" />
          </span>
        </button>

        {several && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous image" className={`${ARROW} left-2`}>
              <StoreIcon name="chevronLeft" className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next image" className={`${ARROW} right-2`}>
              <StoreIcon name="chevronRight" className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {lightboxOpen && (
        <ImageLightbox
          images={photos}
          title={title}
          startIndex={index}
          onClose={closeLightbox}
          onIndexChange={(i) => choose(photos[i])}
          className={lightboxClassName}
        />
      )}
    </div>
  );
}
