"use client";

import { useEffect } from "react";

const AUTO_DISMISS_MS = 4500;

/**
 * Bottom-right "deleted" confirmation toast, styled to match the products
 * table's delete flow (dark card, amber check badge). See all-products/Toast.
 */
export default function Toast({ message, visible, onDismiss }) {
  useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(() => onDismiss?.(), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [visible, message, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed right-6 bottom-6 z-50 max-w-[calc(100vw-2rem)] transition-all duration-300${
        visible ? "" : " translate-y-[120px] opacity-0 pointer-events-none"
      }`}
    >
      <div className="relative flex items-center gap-3 rounded-2xl border border-accent-500/30 bg-darksurface text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] pl-4 pr-9 py-3">
        <span className="flex-shrink-0 w-8 h-8 rounded-[10px] grid place-items-center bg-accent-500/10 text-accent-300">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <div>
          <b className="block text-[13px] font-bold">Item deleted</b>
          {message && <span className="block text-xs text-slate-400">{message}</span>}
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="absolute top-2.5 right-2.5 text-slate-500 hover:text-white text-base leading-none"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
