"use client";

import { useRef } from "react";
import Icon from "@/components/admin-panel/Icon";

export default function CategoryDetailsSection({
  title,
  titleError,
  titleInputRef,
  description,
  image,
  onTitleChange,
  onDescriptionChange,
  onImagePicked,
  onImageRemoved,
}) {
  const fileInputRef = useRef(null);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) onImagePicked(file);
    e.target.value = "";
  }

  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
      <div className="flex flex-col md:flex-row gap-5 items-start">
        <div
          role="button"
          tabIndex={0}
          aria-label="Add category image"
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className="relative w-full md:w-36 h-36 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-primary-400 dark:hover:border-accent-500/50 bg-slate-50 dark:bg-darksurface2/50 flex flex-col items-center justify-center cursor-pointer transition-colors group shrink-0 overflow-hidden"
        >
          {image ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- blob: object URL from a local upload, not optimizable by next/image */}
              <img src={image.url} alt={image.name || ""} className="w-full h-full object-cover" />
              <button
                type="button"
                aria-label="Remove image"
                onClick={(e) => {
                  e.stopPropagation();
                  onImageRemoved();
                }}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-900/70 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              >
                &times;
              </button>
            </>
          ) : (
            <>
              <Icon
                name="plus-circle"
                className="w-8 h-8 text-slate-400 group-hover:text-primary-500 dark:group-hover:text-accent-400 transition-colors"
              />
              <span className="text-[11px] font-medium text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 mt-2">
                Add Image
              </span>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-hidden="true"
            onChange={handleFileChange}
          />
        </div>

        <div className="flex-1 space-y-4 w-full">
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
              Category Title
            </label>
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="e.g. Wedding Bands, Diamond Rings"
              aria-label="Category title"
              className={`field-input h-11${titleError ? " border-red-400" : ""}`}
            />
            {titleError && <p className="text-xs text-error mt-1">Title is required.</p>}
          </div>

          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Add a description for this collection…"
              aria-label="Category description"
              className="w-full p-3 rounded-xl bg-slate-100 dark:bg-darksurface2 border border-transparent focus:border-primary-400 dark:focus:border-accent-500 focus:bg-white dark:focus:bg-darksurface2 focus:outline-none focus:ring-4 focus:ring-primary-500/10 text-sm transition-all font-medium text-slate-800 dark:text-white resize-y"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Icon name="shield" className="w-3.5 h-3.5" /> Visible in 3 sales channels
            </span>
            <button type="button" className="text-xs font-semibold text-primary-600 dark:text-accent-400 hover:underline">
              Manage Channels
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
