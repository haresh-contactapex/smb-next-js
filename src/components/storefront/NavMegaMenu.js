"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BandIcon from "./bandIcons";
import StoreIcon from "./icons";
import { CURRENT_NAV_LINK } from "./NavLink";
import { isCurrentLink, isCurrentPath } from "./navLinks";
import useImageLoaded from "./useImageLoaded";

// Grace period so the pointer can cross the gap between the link and the panel.
const CLOSE_DELAY_MS = 150;

// The preview images are real catalog photos: each item shows a product from its
// own category, from /api/storefront/category-images. One request per menu, made
// the first time that menu is opened and shared by every later hover. A failure
// yields no images (the previews still show their button) and is retried the
// next time the page loads.
const menuImageRequests = new Map();

function loadMenuImages(slugKey) {
  if (!menuImageRequests.has(slugKey)) {
    const request = fetch(`/api/storefront/category-images?slugs=${encodeURIComponent(slugKey)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Request failed");
        return json.data.images;
      })
      .catch(() => {
        menuImageRequests.delete(slugKey);
        return {};
      });
    menuImageRequests.set(slugKey, request);
  }
  return menuImageRequests.get(slugKey);
}

// `null` until loaded, then { [categorySlug]: photoUrl | null }.
function useMenuImages(slugKey, enabled) {
  const [images, setImages] = useState(null);

  useEffect(() => {
    if (!enabled || images) return undefined;
    let current = true;
    loadMenuImages(slugKey).then((loadedImages) => current && setImages(loadedImages));
    return () => {
      current = false;
    };
  }, [enabled, images, slugKey]);

  return images;
}

// One item's preview: the photo, filling the column, and a Shop now button. All
// of them are stacked in the same grid cell and cross-faded, so switching items
// never reflows or flashes. Hidden layers are also `invisible`, which keeps their
// link out of the tab order. The active layer must *inherit* visibility rather
// than set `visible`: an explicit `visible` overrides the closed panel's
// `invisible`, leaving the layer hoverable and focusable under a closed menu.
function PreviewLayer({ item, image, loading, active, showImage }) {
  const { loaded, imageProps } = useImageLoaded();
  const pending = image ? !loaded : loading;

  return (
    <div
      aria-hidden={!active}
      className={`col-start-1 row-start-1 flex flex-col transition-[opacity,visibility] duration-300 ease-out motion-reduce:transition-none ${
        active ? "opacity-100 [visibility:inherit]" : "opacity-0 invisible"
      }`}
    >
      <div className={`relative min-h-[170px] flex-1 overflow-hidden rounded-[10px] ${pending ? "shimmer" : "bg-[#FAFAFA]"}`}>
        {showImage && image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            {...imageProps}
            src={image}
            alt=""
            className={`absolute inset-0 h-full w-full object-contain p-2 mix-blend-multiply transition-opacity duration-500 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        )}
      </div>
      <Link
        href={item.href}
        tabIndex={active ? undefined : -1}
        aria-label={`Shop ${item.label}`}
        className="mt-3 block rounded-lg border border-[#dddddd] bg-white p-[9px] text-center text-[12px] text-[#222222] transition-colors hover:border-[#ef9822] hover:text-[#ef9822]"
      >
        Shop now&nbsp; →
      </Link>
    </div>
  );
}

// A header link that opens a mega menu below the navbar: columns of items on the
// left, and a preview of the hovered (or focused) item on the right. The first
// item for the page you're on is active whenever the menu opens (the first item
// on any other page), and that item keeps an orange label so it still reads as
// current once you hover another. The link itself is highlighted for any page in
// the menu. Opens on hover and keyboard focus; Escape closes it.
//
// When every column holds a single item, that item stretches to fill the whole
// column instead of sitting at the top, so a short menu doesn't look empty.
//
// The panel is positioned against the sticky <header> (the nearest positioned
// ancestor), so it spans below the whole navbar rather than under the link.
export default function NavMegaMenu({ link }) {
  const { columns } = link.megaMenu;
  const items = columns.flat();
  const fillColumns = columns.every((column) => column.length === 1);
  const panelId = useId();

  const pathname = usePathname();
  const currentIndex = items.findIndex((item) => isCurrentPath(pathname, item.href));
  const sectionCurrent = isCurrentLink(link, pathname);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [everOpened, setEverOpened] = useState(false);
  const closeTimer = useRef(null);
  const wrapperRef = useRef(null);
  const skipFocusOpen = useRef(false);
  const images = useMenuImages(items.map((item) => item.slug).join(","), everOpened);

  const cancelClose = useCallback(() => {
    clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  const openMenu = useCallback(() => {
    cancelClose();
    if (!open) setActive(Math.max(currentIndex, 0));
    setOpen(true);
    setEverOpened(true);
  }, [cancelClose, open, currentIndex]);

  const closeNow = useCallback(() => {
    cancelClose();
    setOpen(false);
  }, [cancelClose]);

  const closeSoon = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }, [cancelClose]);

  useEffect(() => cancelClose, [cancelClose]);

  function handleFocus(event) {
    // Only keyboard focus opens it; a mouse click on a link also focuses it.
    if (!skipFocusOpen.current && event.target.matches?.(":focus-visible")) openMenu();
  }

  function handleBlur(event) {
    if (!wrapperRef.current?.contains(event.relatedTarget)) closeSoon();
  }

  function handleKeyDown(event) {
    if (event.key !== "Escape" || !open) return;
    closeNow();
    // Hand focus back to the link without that focus reopening the menu.
    skipFocusOpen.current = true;
    wrapperRef.current?.querySelector("a")?.focus();
    skipFocusOpen.current = false;
  }

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={openMenu}
      onMouseLeave={closeSoon}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onClick={closeNow}
    >
      <Link
        href={link.href}
        aria-expanded={open}
        aria-controls={panelId}
        aria-current={isCurrentPath(pathname, link.href) ? "page" : sectionCurrent ? "true" : undefined}
        className={`relative inline-flex items-center gap-1 whitespace-nowrap hover:text-[#ef9822] transition-colors ${open ? "text-[#ef9822]" : ""} ${
          sectionCurrent ? CURRENT_NAV_LINK : ""
        } ${
          // Bridges the header padding between the link and the panel while open.
          open ? "after:absolute after:inset-x-0 after:top-full after:h-8" : ""
        }`}
      >
        {link.label}
        <StoreIcon name="chevronDown" className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </Link>

      <div
        id={panelId}
        className={`absolute left-1/2 top-[calc(100%+1px)] z-10 grid w-[min(940px,calc(100vw-2rem))] -translate-x-1/2 grid-cols-[1fr_1fr_1.15fr] gap-7 rounded-b-[18px] border border-t-0 border-[#e9e9e9] bg-white p-[26px] text-[#171717] normal-case font-normal tracking-normal shadow-[0_18px_45px_rgba(0,0,0,0.10)] transition duration-200 ease-out motion-reduce:transition-none ${
          fillColumns ? "auto-rows-[minmax(280px,auto)]" : ""
        } ${open ? "visible translate-y-0 opacity-100" : "pointer-events-none invisible translate-y-2.5 opacity-0"}`}
      >
        {columns.map((column, columnIndex) => (
          <ul key={columnIndex} className="flex flex-col gap-[3px]">
            {column.map((item) => {
              const index = items.indexOf(item);
              return (
                <li key={item.label} className={fillColumns ? "flex flex-1" : undefined}>
                  <Link
                    href={item.href}
                    aria-current={index === currentIndex ? "page" : undefined}
                    onMouseEnter={() => setActive(index)}
                    onFocus={() => setActive(index)}
                    className={`flex items-start gap-3 rounded-[9px] transition-colors duration-200 hover:bg-[#f5f5f5] ${
                      fillColumns ? "flex-1 px-3.5 py-[18px]" : "px-2.5 py-[11px]"
                    } ${index === active ? "bg-[#f5f5f5]" : ""}`}
                  >
                    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-[7px] border border-[#dedede] bg-white text-[#666666]">
                      <BandIcon name={item.icon} />
                    </span>
                    <span>
                      <strong className={`block text-[14px] font-semibold leading-[18px] ${index === currentIndex ? "text-[#ef9822]" : ""}`}>{item.label}</strong>
                      {item.description && (
                        <small className={`mt-0.5 block text-[12px] leading-4 text-[#777777] ${link.megaMenu.fullDescriptions ? "" : "line-clamp-3"}`}>
                          {item.description}
                        </small>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ))}

        <div className="grid grid-rows-1 rounded-[15px] bg-[#f5f5f5] p-[11px]">
          {items.map((item, index) => (
            <PreviewLayer
              key={item.label}
              item={item}
              image={images?.[item.slug] || null}
              loading={everOpened && images === null}
              active={index === active}
              showImage={everOpened}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
