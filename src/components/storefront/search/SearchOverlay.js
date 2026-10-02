"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StoreIcon from "../icons";
import useImageLoaded from "../useImageLoaded";
import { requestJson } from "../cart/cartApi";
import { useSearch } from "./SearchProvider";
import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";
import { formatCurrency } from "@/lib/currency";
import {
  SEARCH_DEBOUNCE_MS,
  SEARCH_MAX_LENGTH,
  SEARCH_MIN_LENGTH,
  SUGGESTION_LIMIT,
  cleanSearchText,
  searchApiUrl,
  searchPageUrl,
} from "./searchHelpers";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function SuggestionRow({ product, currency, onNavigate }) {
  const { loaded, imageProps } = useImageLoaded();
  const onSale = product.compareAtPrice > product.price;

  return (
    <li>
      <Link
        href={`/products/${product.handle}`}
        onClick={onNavigate}
        data-search-result
        className="flex items-center gap-4 rounded-md p-2 transition-colors hover:bg-gray-50 focus-visible:bg-gray-50"
      >
        <span className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-md ${loaded || !product.image ? "bg-[#FAFAFA]" : "shimmer"}`}>
          {product.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              {...imageProps}
              src={product.image}
              alt=""
              className={`h-full w-full object-contain p-1 mix-blend-multiply transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
            />
          )}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-[600] leading-tight text-[#333333]">{product.title}</span>
          <span className="mt-1 block text-sm">
            <span className="font-semibold text-[#333333]">{formatCurrency(product.price, currency)}</span>
            {onSale && (
              <s className="ml-1.5 text-gray-400" aria-label={`Was ${formatCurrency(product.compareAtPrice, currency)}`}>
                {formatCurrency(product.compareAtPrice, currency)}
              </s>
            )}
          </span>
        </span>
      </Link>
    </li>
  );
}

function SuggestionSkeleton() {
  return (
    <ul aria-hidden="true" className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: SUGGESTION_LIMIT }, (_, i) => (
        <li key={i} className="flex items-center gap-4 p-2">
          <div className="shimmer h-16 w-16 flex-shrink-0 rounded-md" />
          <div className="flex-1 space-y-2">
            <div className="shimmer h-3.5 w-4/5 rounded" />
            <div className="shimmer h-3 w-16 rounded" />
          </div>
        </li>
      ))}
    </ul>
  );
}

// Drop-down search from the top of the page: type to see matching products
// (price and picture included), press Enter or "View all" for the full results
// page. Suggestions are looked up once typing pauses, and a newer lookup
// replaces any still in flight.
export default function SearchOverlay() {
  const { isOpen, closeSearch } = useSearch();
  const { currency } = useGeneralSettings();
  const router = useRouter();

  const [text, setText] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const returnFocusRef = useRef(null);
  // Answers already fetched this visit, so retyping a word doesn't ask again.
  const cacheRef = useRef(new Map());

  const term = cleanSearchText(text);
  const ready = term.length >= SEARCH_MIN_LENGTH;

  // Modal behaviour: start fresh, focus the field, lock page scroll, close on
  // Escape, arrow through the suggestions and keep Tab inside the panel.
  useEffect(() => {
    if (!isOpen) return undefined;

    setText("");
    returnFocusRef.current = document.activeElement;
    // Wait a frame: the closed panel is visibility:hidden until its transition starts, and hidden elements can't take focus.
    const focusFrame = requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    document.body.style.overflow = "hidden";

    const onKey = (event) => {
      const panel = panelRef.current;
      if (!panel) return;

      if (event.key === "Escape") {
        closeSearch();
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        const links = [...panel.querySelectorAll("[data-search-result]")];
        if (links.length === 0) return;
        event.preventDefault();
        const index = links.indexOf(document.activeElement);
        if (event.key === "ArrowDown") links[Math.min(index + 1, links.length - 1)].focus();
        else if (index <= 0) inputRef.current?.focus();
        else links[index - 1].focus();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = [...panel.querySelectorAll(FOCUSABLE)];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!panel.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      const target = returnFocusRef.current;
      if (target instanceof HTMLElement && document.contains(target)) target.focus({ preventScroll: true });
    };
  }, [isOpen, closeSearch]);

  // Look up suggestions for what has been typed, once typing pauses.
  useEffect(() => {
    if (!isOpen || !ready) {
      setStatus("idle");
      return undefined;
    }

    const key = term.toLowerCase();
    const cached = cacheRef.current.get(key);
    if (cached) {
      setResult(cached);
      setStatus("done");
      return undefined;
    }

    setStatus("loading");
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const response = await requestJson("GET", searchApiUrl({ query: term, limit: SUGGESTION_LIMIT }), undefined, controller.signal);
      if (response.aborted) return; // a newer lookup has taken over
      if (!response.ok) {
        setError(response.error);
        setStatus("error");
        return;
      }
      cacheRef.current.set(key, response.data);
      setResult(response.data);
      setStatus("done");
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, ready, term, attempt]);

  function submit(event) {
    event.preventDefault();
    if (!term) {
      inputRef.current?.focus();
      return;
    }
    closeSearch();
    router.push(searchPageUrl(term));
  }

  function clear() {
    setText("");
    inputRef.current?.focus();
  }

  let body;
  if (!ready) {
    body = <p className="py-6 text-sm text-gray-500">Start typing to search by product name or SKU.</p>;
  } else if (status === "error") {
    body = (
      <div className="py-6 text-sm">
        <p role="alert" className="text-red-600">
          {error}
        </p>
        <button
          type="button"
          onClick={() => setAttempt((current) => current + 1)}
          className="mt-3 rounded-md border border-[#ef9822] px-5 py-2 text-xs font-semibold uppercase tracking-wide text-[#ef9822] transition-colors hover:bg-[#ef9822] hover:text-white"
        >
          Try again
        </button>
      </div>
    );
  } else if (!result || (result.products.length === 0 && status === "loading")) {
    body = <SuggestionSkeleton />;
  } else if (result.products.length === 0) {
    body = (
      <div className="py-6 text-sm">
        <p className="text-[#333333]">
          No results for <span className="font-semibold">“{result.query}”</span>.
        </p>
        <p className="mt-1 text-gray-500">Check the spelling or try a different word.</p>
      </div>
    );
  } else {
    body = (
      <div className={`transition-opacity duration-200 ${status === "loading" ? "opacity-60" : ""}`} aria-busy={status === "loading"}>
        <h2 className="mb-2 border-b border-gray-100 pb-2 text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">Products</h2>
        <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {result.products.map((product) => (
            <SuggestionRow key={product.id} product={product} currency={currency} onNavigate={closeSearch} />
          ))}
        </ul>
        <Link
          href={searchPageUrl(result.query)}
          onClick={closeSearch}
          data-search-result
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#333333] transition-colors hover:text-[#ef9822]"
        >
          View all {result.total} {result.total === 1 ? "result" : "results"} for “{result.query}”
          <StoreIcon name="arrowRight" className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <>
      <div
        onClick={closeSearch}
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className={`fixed inset-x-0 top-0 z-[70] max-h-full overflow-y-auto bg-white shadow-2xl transition-[transform,visibility] duration-300 ease-in-out ${
          isOpen ? "translate-y-0" : "-translate-y-full invisible"
        }`}
      >
        <div className="mx-auto max-w-[1100px] px-4 py-4 sm:px-8 sm:py-6">
          <form
            role="search"
            action="/search"
            method="get"
            onSubmit={submit}
            className="flex items-center gap-2 border-b-2 border-gray-200 transition-colors focus-within:border-[#ef9822] sm:gap-3"
          >
            <button type="submit" aria-label="Search" className="-ml-2 flex-shrink-0 p-2 text-[#555555] transition-colors hover:text-[#ef9822]">
              <StoreIcon name="search" className="h-6 w-6" />
            </button>
            <input
              ref={inputRef}
              type="search"
              name="q"
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={SEARCH_MAX_LENGTH}
              placeholder="Search for rings, bands, SKUs…"
              aria-label="Search the store"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              className="min-w-0 flex-1 bg-transparent py-3 text-[18px] text-[#333333] placeholder:text-gray-400 focus:outline-none sm:text-[22px] [&::-webkit-search-cancel-button]:hidden"
            />
            {text && (
              <button
                type="button"
                onClick={clear}
                className="flex-shrink-0 px-1 text-xs font-semibold uppercase tracking-wide text-gray-500 transition-colors hover:text-[#ef9822]"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={closeSearch}
              aria-label="Close search"
              className="-mr-2 flex-shrink-0 rounded-full p-2 text-[#555555] transition-colors hover:bg-gray-50 hover:text-[#ef9822]"
            >
              <StoreIcon name="close" className="h-6 w-6" />
            </button>
          </form>

          <div className="mt-4 min-h-[88px]">{body}</div>
          <p role="status" aria-live="polite" className="sr-only">
            {status === "done" && result ? `${result.total} ${result.total === 1 ? "result" : "results"} for ${result.query}` : ""}
          </p>
        </div>
      </div>
    </>
  );
}
