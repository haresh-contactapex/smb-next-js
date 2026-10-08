"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ProductCard from "./ProductCard";
import { ProductCardSkeleton } from "./ProductListingSkeleton";
import { OTHER_METAL_COLOR, metalColor, metalLabel } from "./metals";
import { requestJson } from "./cart/cartApi";
import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";
import { moneyInputWrap } from "@/lib/currency";

const PRICE_INPUT =
  "w-full bg-gray-50 text-sm pl-7 pr-2 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 transition-shadow";

// How long to wait after the last keystroke in a price box before searching.
const FILTER_DEBOUNCE_MS = 350;

const NO_OPTIONS = { metals: [], sizes: [] };
const NO_FILTER = { min: "", max: "", metals: [], size: "" };

// Only a non-negative number counts as a price bound; anything else is "not set".
const cleanPrice = (value) => (value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0 ? value : "");

// Two filters are the same search when they ask for the same price range, metals and size.
const sameFilter = (a, b) => a.min === b.min && a.max === b.max && a.size === b.size && a.metals.join("|") === b.metals.join("|");

function listingUrl({ offset, limit, min, max, metals, size, category }) {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  if (category) params.set("category", category);
  if (cleanPrice(min) !== "") params.set("minPrice", cleanPrice(min));
  if (cleanPrice(max) !== "") params.set("maxPrice", cleanPrice(max));
  for (const metal of metals) params.append("metal", metal);
  if (size) params.set("size", size);
  return `/api/storefront/products?${params}`;
}

// Filter bar + product grid. The first page arrives from the server; "Load more"
// and the price filter fetch from /api/storefront/products, so the browser only
// ever holds the products the shopper has asked to see. The metal and band size
// choices come from the catalog's own variant options (`filterOptions`); the price,
// metal and size filters all search on the server.
export default function ProductListing({ initialProducts, initialTotal, pageSize, failed = false, categorySlug = null, filterOptions = NO_OPTIONS }) {
  const { currency, currencyPosition } = useGeneralSettings();
  // The symbol sits inside the price fields, before or after the digits per Settings -> Currency & Tax.
  const price = moneyInputWrap(currency, currencyPosition);
  const symbolAfter = currencyPosition === "after";
  const symbolClass = `absolute ${symbolAfter ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 text-sm`;
  const priceInputStyle = symbolAfter
    ? { paddingLeft: "0.5rem", paddingRight: price.style["--sign-pad"] }
    : { paddingLeft: price.style["--sign-pad"] };
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [metals, setMetals] = useState([]);
  const [size, setSize] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [products, setProducts] = useState(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  // The filters the list on screen was fetched with. They trail the inputs by the
  // debounce, and "Load more" continues with them, not with half-typed text.
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

      const result = await requestJson("GET", listingUrl({ offset, limit: pageSize, category: categorySlug, ...range }), undefined, controller.signal);
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
    [pageSize, categorySlug]
  );

  // Any filter change searches again from the first page, once typing or clicking pauses.
  useEffect(() => {
    const wanted = { min: minPrice, max: maxPrice, metals, size };
    if (sameFilter(wanted, applied)) return undefined;
    const timer = setTimeout(() => {
      setApplied(wanted);
      fetchProducts({ replace: true, offset: 0, range: wanted });
    }, FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [minPrice, maxPrice, metals, size, applied, fetchProducts]);

  const loadMore = () => fetchProducts({ replace: false, offset: products.length, range: applied });
  // After a failure: redo the search if nothing is on screen, otherwise fetch the next page again.
  const retry = () => (products.length === 0 ? fetchProducts({ replace: true, offset: 0, range: applied }) : loadMore());

  const toggleMetal = (code) =>
    setMetals((current) => (current.includes(code) ? current.filter((c) => c !== code) : [...current, code]));

  // Collapsed by default; the badge on the header shows how many filters are set.
  const activeFilterCount = metals.length + (size ? 1 : 0) + (minPrice !== "" || maxPrice !== "" ? 1 : 0);

  const filtering = loading === "filter";
  const loadingMore = loading === "more";
  const hasMore = products.length < total;
  const hasFilter = !sameFilter(applied, NO_FILTER);
  const clearFilters = () => {
    setMetals([]);
    setSize("");
    setMinPrice("");
    setMaxPrice("");
  };
  // One removable chip per filter in use, shown in the Filters bar.
  const money = (amount) => (symbolAfter ? `${amount} ${price.symbol}` : `${price.symbol}${amount}`);
  const priceLabel =
    minPrice !== "" && maxPrice !== "" ? `${money(minPrice)} – ${money(maxPrice)}` : minPrice !== "" ? `From ${money(minPrice)}` : `Up to ${money(maxPrice)}`;
  const chips = [
    ...metals.map((value) => ({
      key: `metal:${value}`,
      label: value,
      swatch: metalColor(value) || OTHER_METAL_COLOR,
      remove: () => toggleMetal(value),
    })),
    ...(size ? [{ key: "size", label: `Size ${size}`, remove: () => setSize("") }] : []),
    ...(minPrice !== "" || maxPrice !== ""
      ? [{ key: "price", label: priceLabel, remove: () => { setMinPrice(""); setMaxPrice(""); } }]
      : []),
  ];
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
      <section aria-label="Filters" className="border-t border-b border-gray-200 mt-10 sm:mt-12 fade-in-up delay-300">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
          <h2 className="m-0">
            <button
              type="button"
              id="filters-toggle"
              aria-expanded={filtersOpen}
              aria-controls="filters-panel"
              onClick={() => setFiltersOpen((open) => !open)}
              className="flex items-center gap-3 text-left cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ef9822] rounded-md"
            >
              <span className="flex items-center gap-3 text-sm font-semibold uppercase tracking-wide text-[#333333] group-hover:text-[#ef9822] transition-colors">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M4 6h16M7 12h10M10 18h4" />
                </svg>
                Filters
                {activeFilterCount > 0 && (
                  <span className="min-w-5 h-5 px-1.5 inline-flex items-center justify-center rounded-full bg-[#ef9822] text-white text-[11px] font-semibold normal-case tracking-normal">
                    {activeFilterCount}
                    <span className="sr-only"> active</span>
                  </span>
                )}
              </span>
            </button>
          </h2>

          {/* What is filtered right now, readable and removable even while the panel is closed. */}
          {chips.length > 0 && (
            <ul aria-label="Applied filters" className="order-last sm:order-none flex w-full sm:w-auto sm:flex-1 flex-wrap items-center gap-2 m-0 p-0 list-none">
              {chips.map((chip) => (
                <li key={chip.key}>
                  <button
                    type="button"
                    onClick={chip.remove}
                    aria-label={`Remove filter: ${chip.label}`}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 pl-3 pr-2 py-1 text-xs font-medium text-[#333333] hover:border-[#ef9822] hover:text-[#ef9822] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ef9822]"
                  >
                    {chip.swatch && <span aria-hidden="true" style={{ background: chip.swatch }} className="w-3 h-3 rounded-full ring-1 ring-gray-300" />}
                    {chip.label}
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => setFiltersOpen((open) => !open)}
            className="ml-auto cursor-pointer"
          >
            <svg
              viewBox="0 0 24 24"
              className={`w-5 h-5 shrink-0 transition-transform duration-300 ${filtersOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>

        <div
          id="filters-panel"
          role="region"
          aria-labelledby="filters-toggle"
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${filtersOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr] invisible"}`}
        >
          <div className="overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-12 pt-4 pb-8">
        {filterOptions.metals.length > 0 && (
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
          <h3 className="text-sm font-semibold text-[#333333] mb-5">Metal Color</h3>
          <div className="flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-3">
            {filterOptions.metals.map((value) => {
              const active = metals.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  title={value}
                  aria-label={value}
                  aria-pressed={active}
                  onClick={() => toggleMetal(value)}
                  className="flex flex-col items-center gap-2 cursor-pointer group max-w-[4.5rem]"
                >
                  <span
                    style={{ background: metalColor(value) || OTHER_METAL_COLOR }}
                    className={`w-5 h-5 rounded-full ring-1 ring-offset-2 transition-all ${
                      active ? "ring-[#ef9822]" : "ring-transparent group-hover:ring-gray-300"
                    }`}
                  />
                  <span aria-hidden="true" className="text-[11px] font-medium leading-tight">{metalLabel(value)}</span>
                </button>
              );
            })}
          </div>
        </div>
        )}

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

        {filterOptions.sizes.length > 0 && (
        <fieldset className="flex flex-col items-center sm:items-start text-center sm:text-left sm:col-span-2 lg:col-span-1">
          <legend className="text-sm font-semibold text-[#333333] mb-5">Band Size</legend>
          <div className="grid grid-cols-6 gap-y-3 gap-x-4 sm:gap-x-6 text-sm w-full max-w-lg">
            {filterOptions.sizes.map((value) => (
              <label key={value} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name="band_size"
                  value={value}
                  checked={size === value}
                  onChange={() => setSize(value)}
                  // A radio can't be unticked by itself, so clicking the chosen size again clears it.
                  onClick={() => size === value && setSize("")}
                  className="custom-radio"
                />
                <span className="text-[#555555] group-hover:text-[#ef9822] transition-colors">{value}</span>
              </label>
            ))}
          </div>
        </fieldset>
        )}
            </div>
            {activeFilterCount > 0 && (
              <div className="pb-6 text-center sm:text-left">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-semibold uppercase tracking-wide text-[#ef9822] underline underline-offset-4 hover:text-[#d4850f] cursor-pointer"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
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
