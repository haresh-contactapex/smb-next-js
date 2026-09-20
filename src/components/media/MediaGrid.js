"use client";

import Icon from "@/components/admin-panel/Icon";

export default function MediaGrid({ items, onSelect }) {
  if (items.length === 0) {
    return (
      <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-8 text-center">
        <Icon name="image" className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-400">No media yet. Uploaded images will appear here for reuse.</p>
      </section>
    );
  }

  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className="group relative border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden aspect-square bg-slate-100 dark:bg-darksurface2/60"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- served from public/uploads, arbitrary runtime paths */}
            <img src={item.url} alt={item.altText || item.fileName} className="w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-slate-900/70 text-white text-[10px] px-1.5 py-1 truncate opacity-0 group-hover:opacity-100 transition">
              {item.fileName}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
