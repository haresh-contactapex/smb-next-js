"use client";

import { useState } from "react";
import Icon from "@/components/admin-panel/Icon";

export default function CollectionItemsSection() {
  const [view, setView] = useState("grid");

  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Collection items</h3>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              0
            </span>
          </div>
          <p className="text-[12px] text-slate-400 mt-0.5">Add conditions or products to populate your collection.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={view === "grid"}
            onClick={() => setView("grid")}
            className={`w-8 h-8 grid place-items-center rounded-lg border text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors ${
              view === "grid"
                ? "border-primary-400 dark:border-accent-500 text-primary-600 dark:text-accent-400"
                : "border-slate-200 dark:border-white/10"
            }`}
          >
            <Icon name="grid" className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
            className={`w-8 h-8 grid place-items-center rounded-lg border text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors ${
              view === "list"
                ? "border-primary-400 dark:border-accent-500 text-primary-600 dark:text-accent-400"
                : "border-slate-200 dark:border-white/10"
            }`}
          >
            <Icon name="list" className="w-4 h-4" />
          </button>
        </div>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-xl bg-slate-100 dark:bg-darksurface2/60 border border-slate-200/60 dark:border-white/5 flex flex-col justify-end p-2.5"
            >
              <div className="h-2.5 w-3/4 rounded bg-slate-200 dark:bg-white/10 mb-1.5" />
              <div className="h-2 w-1/2 rounded bg-slate-200 dark:bg-white/10" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-12 rounded-xl bg-slate-100 dark:bg-darksurface2/60 border border-slate-200/60 dark:border-white/5 flex items-center gap-3 px-3"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-white/10 shrink-0" />
              <div className="h-2.5 w-1/3 rounded bg-slate-200 dark:bg-white/10" />
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400 mt-3">
        This collection is empty. Use the Product Rules panel to add conditions or pick products manually.
      </p>
    </section>
  );
}
