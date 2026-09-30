"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/admin-panel/Icon";

const DEBOUNCE_MS = 250;
const LISTBOX_ID = "f-product-listbox";
const optionId = (index) => `f-product-option-${index}`;

/**
 * Type-to-search product picker (ARIA combobox). Suggestions come from
 * /api/reviews/products; choosing one calls `onSelect(product)`. While a
 * product is selected the input shows its title, and any edit to the text
 * drops the selection (`onClear`) so the saved product can never disagree
 * with what is displayed.
 */
export default function ProductSearchField({ selectedId, selectedTitle, error, inputRef, onSelect, onClear }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const localInputRef = useRef(null);
  const requestIdRef = useRef(0);

  // `inputRef` is the form's callback ref (for focusing the first invalid
  // field); keep our own handle too so Clear can refocus the input.
  const setInputRef = (element) => {
    localInputRef.current = element;
    inputRef?.(element);
  };

  const hasSelection = Boolean(selectedId);
  const inputValue = hasSelection ? selectedTitle : query;
  const listOpen = open && !hasSelection;

  useEffect(() => {
    if (!listOpen) return undefined;
    setStatus("loading");
    const thisRequest = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/reviews/products?q=${encodeURIComponent(query.trim())}`);
        const json = await res.json();
        if (thisRequest !== requestIdRef.current) return;
        if (!res.ok || !json.success) throw new Error(json.error || "Couldn't load products.");
        setResults(json.data || []);
        setActiveIndex(0);
        setStatus("done");
      } catch {
        if (thisRequest !== requestIdRef.current) return;
        setResults([]);
        setStatus("error");
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, listOpen]);

  // Ignore a response that arrives after the list closed.
  useEffect(() => {
    if (!listOpen) requestIdRef.current += 1;
  }, [listOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function choose(product) {
    onSelect(product);
    setQuery("");
    setOpen(false);
  }

  function handleChange(event) {
    setQuery(event.target.value);
    setOpen(true);
    if (hasSelection) onClear();
  }

  function handleClear() {
    setQuery("");
    setOpen(true);
    onClear();
    localInputRef.current?.focus();
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      if (listOpen) {
        event.preventDefault();
        setOpen(false);
      }
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (hasSelection) return;
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (results.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => (index + step + results.length) % results.length);
      return;
    }
    // Enter while choosing picks the highlighted suggestion instead of
    // submitting the form half-filled.
    if (event.key === "Enter" && listOpen) {
      event.preventDefault();
      if (status === "done" && results[activeIndex]) choose(results[activeIndex]);
    }
  }

  function handleBlur(event) {
    if (!containerRef.current?.contains(event.relatedTarget)) setOpen(false);
  }

  const trimmedQuery = query.trim();
  const statusMessage =
    status === "loading"
      ? "Searching…"
      : status === "error"
        ? "Couldn't load products."
        : `${results.length} suggestion${results.length === 1 ? "" : "s"} available`;

  return (
    <div ref={containerRef} className="relative" onBlur={handleBlur}>
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
        <Icon name="search" className="w-4 h-4" />
      </span>
      <input
        id="f-product"
        ref={setInputRef}
        type="text"
        role="combobox"
        aria-expanded={listOpen}
        aria-controls={listOpen && results.length > 0 ? LISTBOX_ID : undefined}
        aria-autocomplete="list"
        aria-activedescendant={listOpen && status === "done" && results[activeIndex] ? optionId(activeIndex) : undefined}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? "f-product-error" : "f-product-help"}
        autoComplete="off"
        value={inputValue}
        onChange={handleChange}
        onFocus={(event) => {
          setOpen(true);
          if (hasSelection) event.target.select();
        }}
        onKeyDown={handleKeyDown}
        placeholder="Search products by name or SKU…"
        className={`field-input pl-10 pr-10${error ? " border-red-400" : ""}`}
      />
      {inputValue && (
        <button
          type="button"
          onClick={handleClear}
          tabIndex={-1}
          aria-label="Clear product"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/10"
        >
          <Icon name="x" className="w-4 h-4" />
        </button>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {listOpen ? statusMessage : ""}
      </p>

      {listOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-darksurface border border-slate-200 dark:border-white/10 rounded-2xl shadow-popover overflow-hidden z-40">
          {status === "loading" && results.length === 0 && (
            <div className="px-4 py-5 text-center text-sm text-slate-400">Searching…</div>
          )}
          {status === "error" && (
            <div className="px-4 py-5 text-center text-sm text-error">Couldn&apos;t load products. Keep typing to retry.</div>
          )}
          {status === "done" && results.length === 0 && (
            <div className="px-4 py-5 text-center text-sm text-slate-400">
              {trimmedQuery ? <>No products match &ldquo;{trimmedQuery}&rdquo;</> : "No products yet"}
            </div>
          )}

          {results.length > 0 && (
            <ul
              id={LISTBOX_ID}
              role="listbox"
              aria-label="Product suggestions"
              className={`max-h-72 overflow-y-auto custom-scroll divide-y divide-slate-100 dark:divide-white/5 transition-opacity${
                status === "loading" ? " opacity-60" : ""
              }`}
            >
              {results.map((product, index) => (
                <li
                  key={product.id}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === activeIndex}
                  // Keep focus in the input so the list doesn't close before the click lands.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(product)}
                  onMouseMove={() => index !== activeIndex && setActiveIndex(index)}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer ${
                    index === activeIndex ? "bg-slate-50 dark:bg-white/5" : ""
                  }`}
                >
                  <span className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-darksurface2 grid place-items-center shrink-0 overflow-hidden">
                    {product.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Icon name="image" className="w-4 h-4 text-slate-400" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                      {product.title}
                    </span>
                    {product.sku && <span className="block text-[11px] text-slate-400 truncate">SKU: {product.sku}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
