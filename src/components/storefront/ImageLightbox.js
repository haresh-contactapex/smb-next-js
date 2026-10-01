"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import StoreIcon from "./icons";
import useImageLoaded from "./useImageLoaded";

const SWIPE_DISTANCE = 50;
const ROUND_BUTTON =
  "flex items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef9822] focus-visible:ring-offset-2 focus-visible:ring-offset-black";

export function imageAlt(title, index) {
  return index === 0 ? title : `${title} – view ${index + 1}`;
}

// Shimmer placeholder until the photo arrives. Keyed by src so each photo
// starts unloaded.
function LightboxImage({ src, alt }) {
  const { loaded, imageProps } = useImageLoaded();
  return (
    <div className="relative bg-white">
      {!loaded && <div className="shimmer w-[min(70vw,420px)] h-[min(55vh,420px)]" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        {...imageProps}
        src={src}
        alt={alt}
        draggable={false}
        className={
          loaded
            ? "block max-h-[80vh] max-w-[calc(100vw-7.5rem)] sm:max-w-[min(80vw,900px)] object-contain select-none"
            : "absolute inset-0 w-full h-full opacity-0"
        }
      />
    </div>
  );
}

// Full-screen photo viewer: dark backdrop, round prev/next arrows, a close
// button and an "n / total" counter. Keyboard (Esc, arrows, Tab trap), swipe
// and backdrop click all work; page scroll is locked and focus is restored.
export default function ImageLightbox({ images, title, startIndex = 0, onClose, className = "" }) {
  const [index, setIndex] = useState(startIndex);
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const swipeStart = useRef(null);
  const count = images.length;
  const multiple = count > 1;

  const go = useCallback((step) => setIndex((current) => (current + step + count) % count), [count]);

  // Lock page scroll (without the scrollbar shifting the layout) and hand focus
  // to the dialog; give it back to whatever opened the viewer on the way out.
  useEffect(() => {
    const opener = document.activeElement;
    const { overflow, paddingRight } = document.body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      opener?.focus?.();
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      } else if (multiple && event.key === "ArrowRight") {
        go(1);
      } else if (multiple && event.key === "ArrowLeft") {
        go(-1);
      } else if (event.key === "Tab") {
        // Keep Tab inside the dialog: wrap at the ends, and pull stray focus back in.
        const buttons = dialogRef.current?.querySelectorAll("button");
        if (!buttons?.length) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        const outside = !dialogRef.current.contains(document.activeElement);
        if (outside || (event.shiftKey && document.activeElement === first)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [go, multiple, onClose]);

  // Warm the cache for the neighbours so arrow clicks feel instant.
  useEffect(() => {
    if (!multiple) return;
    [1, -1].forEach((step) => {
      const preload = new window.Image();
      preload.src = images[(index + step + count) % count];
    });
  }, [images, index, count, multiple]);

  function onTouchStart(event) {
    swipeStart.current = event.touches[0].clientX;
  }

  function onTouchEnd(event) {
    if (swipeStart.current === null) return;
    const distance = event.changedTouches[0].clientX - swipeStart.current;
    swipeStart.current = null;
    if (multiple && Math.abs(distance) >= SWIPE_DISTANCE) go(distance < 0 ? 1 : -1);
  }

  const dialog = (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} – image viewer`}
      onClick={(event) => event.target === event.currentTarget && onClose()}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className={`lightbox-enter fixed inset-0 z-[100] flex items-center justify-center bg-black/80 ${className}`}
    >
      <LightboxImage key={images[index]} src={images[index]} alt={imageAlt(title, index)} />

      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close image viewer"
        className={`${ROUND_BUTTON} absolute top-4 right-4 sm:top-5 sm:right-8 w-11 h-11 sm:w-[50px] sm:h-[50px] bg-white text-black hover:bg-[#ef9822] hover:text-white`}
      >
        <StoreIcon name="close" className="w-6 h-6" />
      </button>

      {multiple && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous image"
            className={`${ROUND_BUTTON} absolute top-1/2 -translate-y-1/2 left-2 sm:left-8 lg:left-[8%] w-11 h-11 sm:w-[50px] sm:h-[50px] bg-[#1a1a1a] text-white hover:bg-[#ef9822]`}
          >
            <StoreIcon name="chevronLeft" className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next image"
            className={`${ROUND_BUTTON} absolute top-1/2 -translate-y-1/2 right-2 sm:right-8 lg:right-[8%] w-11 h-11 sm:w-[50px] sm:h-[50px] bg-[#1a1a1a] text-white hover:bg-[#ef9822]`}
          >
            <StoreIcon name="chevronRight" className="w-5 h-5" />
          </button>
          <div
            aria-live="polite"
            className="absolute bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-[#1a1a1a] px-5 py-2.5 text-sm font-semibold tabular-nums text-white"
          >
            {index + 1} / {count}
          </div>
        </>
      )}
    </div>
  );

  // Portal into the storefront root (keeps fonts/colors) rather than the page
  // wrapper, whose fade-in transform would otherwise trap a fixed overlay.
  return createPortal(dialog, document.getElementById("storefront-root") ?? document.body);
}
