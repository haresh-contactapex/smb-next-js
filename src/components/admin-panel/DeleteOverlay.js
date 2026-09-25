"use client";

import { useEffect, useState } from "react";

/**
 * Full-screen "deleting" loader, shown while a destructive request is in
 * flight. Generic across features — callers supply the wording, this just
 * renders the animated orbit-rings trash icon, backdrop, and progress bar
 * (animation defined in globals.css under .trash-icon / .delete-overlay-*).
 */
export default function DeleteOverlay({ active, title = "Deleting…", itemLabel = "" }) {
  const [fill, setFill] = useState(0);

  useEffect(() => {
    if (!active) {
      setFill(0);
      return undefined;
    }
    let second;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setFill(92));
    });
    return () => {
      cancelAnimationFrame(first);
      if (second) cancelAnimationFrame(second);
    };
  }, [active]);

  if (!active) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(8,15,29,0.85)] backdrop-blur-[10px] p-4"
    >
      <div className="relative overflow-hidden w-full max-w-[360px] rounded-3xl px-8 py-8 text-center bg-[rgba(15,23,42,0.92)] border border-[rgba(51,65,85,0.6)] shadow-[0_25px_60px_rgba(0,0,0,0.5)] text-white">
        <span className="delete-overlay-amb a" aria-hidden="true" />
        <span className="delete-overlay-amb b" aria-hidden="true" />

        <div className="trash-icon-wrap is-loading relative w-[110px] h-[110px] mx-auto">
          <svg viewBox="0 0 160 160" aria-hidden="true" className="trash-icon is-loading is-glow w-full h-full">
            <g className="orbit-a">
              <circle
                cx="80"
                cy="88"
                r="66"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="3"
                strokeDasharray="300 115"
                strokeLinecap="round"
              />
              <circle className="sparkle" cx="80" cy="22" r="4.5" fill="#fef08a" />
            </g>
            <g className="orbit-b">
              <circle
                cx="80"
                cy="88"
                r="56"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="3"
                strokeDasharray="220 132"
                strokeLinecap="round"
              />
              <polygon className="sparkle" points="80,26 86,32 80,38 74,32" fill="#ffffff" stroke="#0284c7" strokeWidth="1.5" />
            </g>
            <g transform="translate(80 92) scale(0.62) translate(-80 -84)">
              <polygon
                className="paper"
                points="70,32 88,28 92,46 74,50"
                fill="#fef3c7"
                stroke="#fbbf24"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <g className="can">
                <path
                  d="M45 58 h70 l-6 72 a9 9 0 0 1 -9 8 h-40 a9 9 0 0 1 -9 -8 z"
                  fill="#0f172a"
                  stroke="#fbbf24"
                  strokeWidth="5"
                  strokeLinejoin="round"
                />
                <line x1="68" y1="74" x2="69" y2="122" stroke="#fde68a" strokeWidth="5" strokeLinecap="round" />
                <line x1="92" y1="74" x2="91" y2="122" stroke="#fde68a" strokeWidth="5" strokeLinecap="round" />
              </g>
              <g className="lid">
                <path
                  d="M64 44 v-8 a6 6 0 0 1 6 -6 h20 a6 6 0 0 1 6 6 v8"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <line x1="36" y1="49" x2="124" y2="49" stroke="#fbbf24" strokeWidth="7" strokeLinecap="round" />
              </g>
            </g>
          </svg>
        </div>

        <p className="mt-5 text-lg font-bold break-words">{title}</p>

        {itemLabel && (
          <div className="delete-overlay-pill inline-flex items-center gap-2 mt-4 px-3.5 py-1.5 rounded-full bg-[rgba(2,6,23,0.8)] border border-slate-700 text-[11px] font-mono text-slate-300 max-w-full">
            <span className="dot w-2 h-2 rounded-full bg-red-400 shrink-0" aria-hidden="true" />
            <span className="truncate">{itemLabel}</span>
          </div>
        )}

        <div className="mt-6 h-1.5 rounded-full bg-slate-700 overflow-hidden">
          <div
            className="delete-overlay-bar h-full rounded-full transition-[width] duration-[4000ms] ease-out"
            style={{ width: `${fill}%` }}
          />
        </div>
      </div>
    </div>
  );
}
