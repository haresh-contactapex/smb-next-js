"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ProductCard from "./ProductCard";
import { ProductCardSkeleton } from "./ProductListingSkeleton";
import { METALS } from "./metals";
import { requestJson } from "./cart/cartApi";
import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";
import { moneyInputWrap } from "@/lib/currency";

const BAND_SIZES = ["5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10"];

const PRICE_INPUT =
  "w-full bg-gray-50 text-sm pl-7 pr-2 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 transition-shadow";

// How long to wait after the last keystroke in a price box before searching.
const FILTER_DEBOUNCE_MS = 350;

const NO_FILTER = { min: "", max: "" };

// Only a non-negative number counts as a price bound; anything else is "not set".
const cleanPrice = (value) => (value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0 ? value : "");

function listingUrl({ offset, limit, min, max }) {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  if (cleanPrice(min) !== "") params.set("minPrice", cleanPrice(min));
  if (cleanPrice(max) !== "") params.set("maxPrice", cleanPrice(max));
  return `/api/storefront/products?${params}`;
}

// Filter bar + product grid. The first page arrives from the server; "Load more"
// and the price filter fetch from /api/storefront/products, so the browser only
// ever holds the products the shopper has asked to see. Metal and band size are
// captured in state ready for when products carry that data.
export default function ProductListing({ initialProducts, initialTotal, pageSize, failed = false }) {
  const { currency, currencyPosition } = useGeneralSettings();
  // The symbol sits inside the price fields, before or after the digits per Settings -> Currency & Tax.
  const price = moneyInputWrap(currency, currencyPosition);
  const symbolAfter = currencyPosition === "after";
  const symbolClass = `absolute ${symbolAfter ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 text-sm`;
  const priceInputStyle = symbolAfter
    ? { paddingLeft: "0.5rem", paddingRight: price.style["--sign-pad"] }
    : { paddingLeft: price.style["--sign-pad"] };
  const [metals, setMetals] = useState([]);
  const [size, setSize] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [products, setProducts] = useState(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  // The price range the list on screen was fetched with. It trails the inputs
  // by the debounce, and "Load more" continues with it, not with half-typed text.
  const [applied, setApplied] = useState(NO_FILTER);
  // "filter" = replacing the list after a price change, "more" = appending the next page.
  const [loading, setLoading] = useState(null);
  const [loadError, setLoadError] = useState("");
  const controllerRef = useRef(null);
  // Cards already on screen at load animate in after the header; later ones just fade in.
  const initialCount = useRef(initialProducts.length).current;

  useEffect(() => () => controllerRef.current?.abort(), []);

  const fetchProducts = useCallback(
    async ({ replace, offset, range }) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      setLoading(replace ? "filter" : "more");
      setLoadError("");
      if (replace) setProducts([]);

      const result = await requestJson("GET", listingUrl({ offset, limit: pageSize, ...range }), undefined, controller.signal);
      if (result.aborted) return; // a newer request has taken over

      setLoading(null);
      if (!result.ok) {
        setLoadError(result.error);
        return;
      }
      setTotal(result.data.total);
      setProducts((current) => {
        if (replace) return result.data.products;
        // A product published meanwhile can shift the pages, so never show one twice.
        const seen = new Set(current.map((product) => product.id));
        return [...current, ...result.data.products.filter((product) => !seen.has(product.id))];
      });
    },
    [pageSize]
  );

  // Price changes search again from the first page, once typing pauses.
  useEffect(() => {
    if (minPrice === applied.min && maxPrice === applied.max) return undefined;
    const timer = setTimeout(() => {
      const range = { min: minPrice, max: maxPrice };
      setApplied(range);
      fetchProducts({ replace: true, offset: 0, range });
    }, FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [minPrice, maxPrice, applied, fetchProducts]);

  const loadMore = () => fetchProducts({ replace: false, offset: products.length, range: applied });
  // After a failure: redo the search if nothing is on screen, otherwise fetch the next page again.
  const retry = () => (products.length === 0 ? fetchProducts({ replace: true, offset: 0, range: applied }) : loadMore());

  const toggleMetal = (code) =>
    setMetals((current) => (current.includes(code) ? current.filter((c) => c !== code) : [...current, code]));

  const filtering = loading === "filter";
  const loadingMore = loading === "more";
  const hasMore = products.length < total;
  const hasFilter = applied.min !== "" || applied.max !== "";
  const GRID = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 sm:gap-y-12 pt-10 sm:pt-12";
  const RETRY_BUTTON =
    "mt-4 border border-[#ef9822] text-[#ef9822] hover:bg-[#ef9822] hover:text-white px-6 py-2 text-xs font-semibold tracking-wide uppercase rounded-md transition-colors";

  let emptyMessage = "";
  if (loadError) emptyMessage = loadError;
  else if (failed && total === 0) emptyMessage = "We couldn’t load our products right now. Please try again shortly.";
  else if (total === 0 && !hasFilter) emptyMessage = "Our collection is coming soon.";
  else emptyMessage = "No products match your filters.";

  return (
    <>
      <section
        aria-label="Filters"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-12 border-t border-b border-gray-200 mt-10 sm:mt-12 py-8 fade-in-up delay-300"
      >
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
          <h3 className="text-sm font-semibold text-[#333333] mb-5">Metal Color</h3>
          <div className="flex flex-wrap justify-center sm:justify-start gap-4">
            {METALS.map((metal) => {
              const active = metals.includes(metal.code);
              return (
                <button
                  key={metal.code}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleMetal(metal.code)}
                  className="flex flex-col items-center gap-2 cursor-pointer group"
                >
                  <span
                    style={{ backgroundColor: metal.color }}
                    className={`w-5 h-5 rounded-full ring-1 ring-offset-2 transition-all ${
                      active ? "ring-[#ef9822]" : "ring-transparent group-hover:ring-gray-300"
                    }`}
                  />
                  <span className="text-[11px] font-medium">{metal.code}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
          <h3 className="text-sm font-semibold text-[#333333] mb-5">Price</h3>
          <div className="flex items-center justify-center sm:justify-start space-x-3 w-full">
            <div className="relative w-full max-w-[120px]">
              <span className={symbolClass}>{price.symbol}</span>
              <input
                style={priceInputStyle}
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="0"
                aria-label="Minimum price"
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
                className={PRICE_INPUT}
              />
            </div>
            <span className="text-sm text-gray-400">to</span>
            <div className="relative w-full max-w-[120px]">
              <span className={symbolClass}>{price.symbol}</span>
              <input
                style={priceInputStyle}
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="15000"
                aria-label="Maximum price"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                className={PRICE_INPUT}
              />
            </div>
          </div>
        </div>

        <fieldset className="flex flex-col items-center sm:items-start text-center sm:text-left sm:col-span-2 lg:col-span-1">
          <legend className="text-sm font-semibold text-[#333333] mb-5">Band Size</legend>
          <div className="grid grid-cols-6 gap-y-3 gap-x-4 sm:gap-x-6 text-sm w-full max-w-lg">
            {BAND_SIZES.map((value) => (
              <label key={value} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name="band_size"
                  value={value}
                  checked={size === value}
                  onChange={() => setSize(value)}
                  className="custom-radio"
                />
                <span className="text-[#555555] group-hover:text-[#ef9822] transition-colors">{value}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      {filtering ? (
        <div className={`${GRID} pb-16 sm:pb-24`} role="status" aria-busy="true">
          <span className="sr-only">Loading products…</span>
          {Array.from({ length: pageSize }, (_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <p role="status" className="text-sm">
            {emptyMessage}
          </p>
          {(loadError || failed) && (
            <button type="button" onClick={retry} className={RETRY_BUTTON}>
              Try again
            </button>
          )}
        </div>
      ) : (
        <>
          <div className={GRID}>
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                delay={(index % 4) * 100 + (index < initialCount ? 300 : 0)}
              />
            ))}
            {loadingMore &&
              Array.from({ length: Math.min(pageSize, total - products.length) }, (_, i) => <ProductCardSkeleton key={`more-${i}`} />)}
          </div>

          <div className="flex flex-col items-center gap-3 pt-12 pb-16 sm:pb-24">
            <p role="status" aria-live="polite" className="text-sm text-gray-500">
              Showing {products.length} of {total} {total === 1 ? "product" : "products"}
            </p>
            <div className="h-1 w-48 rounded-full bg-gray-100 overflow-hidden" aria-hidden="true">
              <div
                className="h-full rounded-full bg-[#ef9822] transition-all duration-500"
                style={{ width: `${Math.min(100, (products.length / Math.max(total, 1)) * 100)}%` }}
              />
            </div>
            {loadError && (
              <p role="alert" className="text-sm text-red-600">
                {loadError}
              </p>
            )}
            {hasMore && (
              <button
                type="button"
                onClick={loadError ? retry : loadMore}
                disabled={loadingMore}
                aria-busy={loadingMore}
                className="mt-2 border border-[#ef9822] text-[#ef9822] hover:bg-[#ef9822] hover:text-white focus-visible:bg-[#ef9822] focus-visible:text-white px-10 py-3 text-sm font-semibold tracking-wide uppercase rounded-md transition-colors disabled:opacity-60 disabled:cursor-wait"
              >
                {loadingMore ? "Loading…" : loadError ? "Try again" : "Load more"}
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}
