"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "./Icon";
import { AVATAR_COLOR_CLASSES, BADGE_COLOR_CLASSES } from "@/components/dashboard/colorClasses";
import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";

const DEBOUNCE_MS = 300;
const MAX_RESULTS = 5;

/**
 * One header search box (orders or products, per `field` from
 * adminPanelConfig.searchFields) with a debounced, keyboard/click-outside
 * dismissable results dropdown backed by `field.endpoint?q=`.
 */
export default function HeaderSearchField({ field }) {
  const { formatMoney } = useGeneralSettings();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setStatus("idle");
      return;
    }

    setStatus("loading");
    const thisRequest = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${field.endpoint}?q=${encodeURIComponent(trimmed)}`);
        const json = await res.json();
        if (thisRequest !== requestIdRef.current) return;
        if (!json.success) {
          setResults([]);
          setStatus("error");
          return;
        }
        setResults((json.data || []).slice(0, MAX_RESULTS));
        setStatus("done");
      } catch {
        if (thisRequest !== requestIdRef.current) return;
        setResults([]);
        setStatus("error");
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, field.endpoint]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      setOpen(false);
      event.currentTarget.blur();
    }
  }

  function closeDropdown() {
    setOpen(false);
  }

  const trimmedQuery = query.trim();
  const showDropdown = open && trimmedQuery.length > 0;

  return (
    <div ref={containerRef} className="relative flex-1">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
        <Icon name="search" className="w-4 h-4" />
      </span>
      <input
        type="text"
        aria-label={field.placeholder}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={field.placeholder}
        className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-100 dark:bg-darksurface2 border border-transparent focus:border-primary-400 dark:focus:border-accent-500 focus:bg-white dark:focus:bg-darksurface2 focus:outline-none focus:ring-4 focus:ring-primary-500/10 text-sm placeholder:text-slate-400 transition-all"
      />

      {showDropdown && (
        <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-darksurface border border-slate-200 dark:border-white/10 rounded-2xl shadow-popover overflow-hidden z-40">
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-white/5 text-[11px] text-slate-400">
            {status === "loading" ? "Searching…" : `Showing results for "${trimmedQuery}"`}
          </div>

          <div className="max-h-96 overflow-y-auto custom-scroll divide-y divide-slate-100 dark:divide-white/5">
            {status === "done" && results.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-slate-400">No results for &ldquo;{trimmedQuery}&rdquo;</div>
            )}
            {status === "error" && (
              <div className="px-4 py-6 text-center text-sm text-error">Couldn&apos;t load results. Try again.</div>
            )}

            {field.type === "products"
              ? results.map((product) => (
                  <Link
                    key={product.id}
                    href={`/admin/edit-product/${product.id}`}
                    onClick={closeDropdown}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    <span className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-darksurface2 grid place-items-center shrink-0 overflow-hidden">
                      {product.thumbnail ? (
                        <img src={product.thumbnail} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Icon name="image" className="w-4 h-4 text-slate-400" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {product.title}
                      </span>
                      {product.sku && <span className="block text-[11px] text-slate-400">SKU: {product.sku}</span>}
                      <span className="block text-[13px] font-bold text-slate-700 dark:text-slate-200">
                        {formatMoney(product.price)}
                      </span>
                    </span>
                  </Link>
                ))
              : results.map((order) => (
                  <Link
                    key={order.id}
                    href={`${field.viewAllHref}?q=${encodeURIComponent(order.id.replace(/^#/, ""))}`}
                    onClick={closeDropdown}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    <span
                      className={`w-9 h-9 rounded-full text-[11px] font-bold grid place-items-center shrink-0 ${
                        AVATAR_COLOR_CLASSES[order.avatarColor] || AVATAR_COLOR_CLASSES.primary
                      }`}
                    >
                      {order.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {order.id}
                      </span>
                      <span className="block text-[11px] text-slate-400 truncate">{order.customer}</span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className="block text-[13px] font-bold text-slate-700 dark:text-slate-200">{order.amount}</span>
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          BADGE_COLOR_CLASSES[order.statusColor] || BADGE_COLOR_CLASSES.info
                        }`}
                      >
                        {order.status}
                      </span>
                    </span>
                  </Link>
                ))}
          </div>

          {results.length > 0 && (
            <Link
              href={`${field.viewAllHref}?q=${encodeURIComponent(trimmedQuery)}`}
              onClick={closeDropdown}
              className="flex items-center justify-center gap-1.5 text-center text-[13px] font-semibold text-primary-600 dark:text-accent-400 py-3 border-t border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5"
            >
              View all results for &ldquo;{trimmedQuery}&rdquo;
              <Icon name="chevron-right" className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
