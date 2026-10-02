"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import StoreIcon from "./icons";
import useImageLoaded from "./useImageLoaded";

// Grace period so the pointer can cross the gap between the link and the panel.
const CLOSE_DELAY_MS = 150;

// The preview images are real catalog photos: one ACTIVE product per menu item,
// from the public storefront listing. One request per page load, and only once
// the menu has been opened. A failure yields no images (the previews still show
// their text) and is retried the next time the page loads.
let menuImagesRequest = null;

function loadMenuImages(count) {
  if (!menuImagesRequest) {
    menuImagesRequest = fetch(`/api/storefront/products?limit=${count}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Request failed");
        return json.data.products.map((product) => product.image).filter(Boolean);
      })
      .catch(() => {
        menuImagesRequest = null;
        return [];
      });
  }
  return menuImagesRequest;
}

// `null` until loaded. With fewer products than menu items the photos repeat.
function useMenuImages(count, enabled) {
  const [images, setImages] = useState(null);

  useEffect(() => {
    if (!enabled || images) return undefined;
    let current = true;
    loadMenuImages(count).then((list) => current && setImages(list));
    return () => {
      current = false;
    };
  }, [enabled, images, count]);

  return images;
}

// One item's preview. All of them are stacked in the same grid cell and
// cross-faded, so switching items never reflows or flashes. Hidden layers are
// also `invisible`, which keeps their link out of the tab order.
function PreviewLayer({ item, image, loading, active, showImage }) {
  const { loaded, imageProps } = useImageLoaded();
  const pending = image ? !loaded : loading;

  return (
    <div
      aria-hidden={!active}
      className={`col-start-1 row-start-1 transition-[opacity,visibility] duration-300 ease-out motion-reduce:transition-none ${
        active ? "opacity-100 visible" : "opacity-0 invisible"
      }`}
    >
      <div className={`relative h-[170px] overflow-hidden rounded-[10px] ${pending ? "shimmer" : "bg-[#FAFAFA]"}`}>
        {showImage && image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            {...imageProps}
            src={image}
            alt=""
            className={`absolute inset-0 h-full w-full object-contain p-3 mix-blend-multiply transition-opacity duration-500 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        )}
      </div>
      <h3 className="mx-[3px] mb-1 mt-[13px] text-[14px] font-semibold text-[#171717]">{item.label}</h3>
      <p className="mx-[3px] mb-3 text-[12px] leading-[17px] text-[#777777]">{item.description}</p>
      <Link
        href={item.href}
        tabIndex={active ? undefined : -1}
        className="block rounded-lg border border-[#dddddd] bg-white p-[9px] text-center text-[12px] text-[#222222] transition-colors hover:border-[#ef9822] hover:text-[#ef9822]"
      >
        Shop now&nbsp; →
      </Link>
    </div>
  );
}

// A header link that opens a mega menu below the navbar: columns of items on the
// left, and a preview of the hovered (or focused) item on the right. The first
// item is active whenever the menu opens. Opens on hover and keyboard focus;
// Escape closes it.
//
// The panel is positioned against the sticky <header> (the nearest positioned
// ancestor), so it spans below the whole navbar rather than under the link.
export default function NavMegaMenu({ link }) {
  const { columns } = link.megaMenu;
  const items = columns.flat();

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [everOpened, setEverOpened] = useState(false);
  const closeTimer = useRef(null);
  const wrapperRef = useRef(null);
  const skipFocusOpen = useRef(false);
  const images = useMenuImages(items.length, everOpened);

  const cancelClose = useCallback(() => {
    clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  const openMenu = useCallback(() => {
    cancelClose();
    if (!open) setActive(0);
    setOpen(true);
    setEverOpened(true);
  }, [cancelClose, open]);

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

  const panelId = "mega-menu-wedding-bands";

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
        className={`relative inline-flex items-center gap-1 whitespace-nowrap hover:text-[#ef9822] transition-colors ${open ? "text-[#ef9822]" : ""} ${
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
          open ? "visible translate-y-0 opacity-100" : "invisible translate-y-2.5 opacity-0"
        }`}
      >
        {columns.map((column, columnIndex) => (
          <ul key={columnIndex} className="flex flex-col gap-[3px]">
            {column.map((item) => {
              const index = items.indexOf(item);
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onMouseEnter={() => setActive(index)}
                    onFocus={() => setActive(index)}
                    className={`flex items-start gap-3 rounded-[9px] px-2.5 py-[11px] transition-colors duration-200 hover:bg-[#f5f5f5] ${
                      index === active ? "bg-[#f5f5f5]" : ""
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-7 w-7 flex-none items-center justify-center rounded-[7px] border border-[#dedede] bg-white text-[13px] text-[#666666]"
                    >
                      {item.icon}
                    </span>
                    <span>
                      <strong className="block text-[14px] font-semibold leading-[18px]">{item.label}</strong>
                      <small className="mt-0.5 block text-[12px] leading-4 text-[#777777]">{item.description}</small>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ))}

        <div className="grid min-h-[280px] content-start rounded-[15px] bg-[#f5f5f5] p-[11px]">
          {items.map((item, index) => (
            <PreviewLayer
              key={item.label}
              item={item}
              image={images?.length ? images[index % images.length] : null}
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
