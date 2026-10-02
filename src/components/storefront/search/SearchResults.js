"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ProductCard from "../ProductCard";
import { ProductCardSkeleton } from "../ProductListingSkeleton";
import { requestJson } from "../cart/cartApi";
import { RESULTS_PAGE_SIZE, searchApiUrl } from "./searchHelpers";

const GRID = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 sm:gap-y-12";
const BUTTON =
  "border border-[#ef9822] text-[#ef9822] hover:bg-[#ef9822] hover:text-white focus-visible:bg-[#ef9822] focus-visible:text-white px-10 py-3 text-sm font-semibold tracking-wide uppercase rounded-md transition-colors disabled:opacity-60 disabled:cursor-wait";

// The matches for one search: the first page arrives from the server and
// "Load more" fetches the rest from /api/storefront/search. The page keys this
// on the search text, so a new search starts from its own first page.
export default function SearchResults({ query, initialProducts, initialTotal, currency = "USD", failed = false }) {
  const [products, setProducts] = useState(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const controllerRef = useRef(null);
  // Cards already on screen at load animate in after the heading; later ones just fade in.
  const initialCount = useRef(initialProducts.length).current;

  useEffect(() => () => controllerRef.current?.abort(), []);

  async function loadMore() {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setLoadError("");
    const result = await requestJson("GET", searchApiUrl({ query, limit: RESULTS_PAGE_SIZE, offset: products.length }), undefined, controller.signal);
    if (result.aborted) return;

    setLoading(false);
    if (!result.ok) {
      setLoadError(result.error);
      return;
    }
    setTotal(result.data.total);
    setProducts((current) => {
      // A product published meanwhile can shift the pages, so never show one twice.
      const seen = new Set(current.map((product) => product.id));
      return [...current, ...result.data.products.filter((product) => !seen.has(product.id))];
    });
  }

  if (failed) {
    return <p role="alert" className="py-16 text-center text-sm">We couldn’t run that search right now. Please try again shortly.</p>;
  }

  if (products.length === 0) {
    return (
      <div className="py-16 text-center">
        <p role="status" className="text-[#333333]">
          No results found for <span className="font-semibold">“{query}”</span>.
        </p>
        <p className="mt-2 text-sm">Check the spelling, try a different word, or browse the collection.</p>
        <Link
          href="/women-wedding-bands"
          className="mt-6 inline-block bg-[#ef9822] px-8 py-3 text-sm font-semibold uppercase tracking-wide text-white rounded-md transition-colors hover:bg-[#d9861a]"
        >
          Browse Wedding Bands
        </Link>
      </div>
    );
  }

  const hasMore = products.length < total;

  return (
    <>
      <p role="status" aria-live="polite" className="pb-8 text-center text-sm">
        {total} {total === 1 ? "result" : "results"} for <span className="font-semibold text-[#333333]">“{query}”</span>
      </p>

      <div className={GRID}>
        {products.map((product, index) => (
          <ProductCard key={product.id} product={product} currency={currency} delay={(index % 4) * 100 + (index < initialCount ? 200 : 0)} />
        ))}
        {loading && Array.from({ length: Math.min(RESULTS_PAGE_SIZE, total - products.length) }, (_, i) => <ProductCardSkeleton key={`more-${i}`} />)}
      </div>

      <div className="flex flex-col items-center gap-3 pt-12 pb-16 sm:pb-24">
        <p className="text-sm text-gray-500">
          Showing {products.length} of {total} {total === 1 ? "product" : "products"}
        </p>
        {loadError && (
          <p role="alert" className="text-sm text-red-600">
            {loadError}
          </p>
        )}
        {hasMore && (
          <button type="button" onClick={loadMore} disabled={loading} aria-busy={loading} className={BUTTON}>
            {loading ? "Loading…" : loadError ? "Try again" : "Load more"}
          </button>
        )}
      </div>
    </>
  );
}
