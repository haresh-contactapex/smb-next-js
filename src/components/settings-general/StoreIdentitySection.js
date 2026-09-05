"use client";

import { useRef } from "react";
import Icon from "@/components/admin-panel/Icon";

function ImageDropTarget({ label, shape, image, onPicked, onRemoved, dimensionsHint }) {
  const fileInputRef = useRef(null);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) onPicked(file);
    e.target.value = "";
  }

  return (
    <div>
      <label className="field-label">{label}</label>
      <div className="flex items-center gap-4">
        <div
          role="button"
          tabIndex={0}
          aria-label={`Change ${label.toLowerCase()}`}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`relative w-20 h-20 ${shape === "square" ? "rounded-xl" : "rounded-2xl"} border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-primary-400 dark:hover:border-accent-500/50 bg-slate-50 dark:bg-darksurface2/50 flex flex-col items-center justify-center cursor-pointer transition-colors group shrink-0 overflow-hidden`}
        >
          {image ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- blob: object URL from a local upload, not optimizable by next/image */}
              <img src={image.url} alt={image.name || ""} className="w-full h-full object-contain p-1" />
              <button
                type="button"
                aria-label={`Remove ${label.toLowerCase()}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoved();
                }}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/70 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              >
                &times;
              </button>
            </>
          ) : (
            <Icon
              name="upload-cloud"
              className="w-6 h-6 text-slate-400 group-hover:text-primary-500 dark:group-hover:text-accent-400 transition-colors"
            />
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
        <p className="text-xs text-slate-400">{dimensionsHint}</p>
      </div>
    </div>
  );
}

export default function StoreIdentitySection({
  storeName,
  logo,
  favicon,
  onFieldChange,
  onLogoPicked,
  onLogoRemoved,
  onFaviconPicked,
  onFaviconRemoved,
}) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Store Identity</h2>

      <div className="space-y-4">
        <div>
          <label className="field-label" htmlFor="f-store-name">
            Store Name
          </label>
          <input
            id="f-store-name"
            type="text"
            value={storeName}
            onChange={(e) => onFieldChange("storeName", e.target.value)}
            placeholder="Your store name"
            aria-label="Store name"
            className="field-input"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ImageDropTarget
            label="Store Logo"
            shape="rounded"
            image={logo}
            onPicked={onLogoPicked}
            onRemoved={onLogoRemoved}
            dimensionsHint="Recommended 512×512px, PNG or SVG."
          />
          <ImageDropTarget
            label="Favicon"
            shape="square"
            image={favicon}
            onPicked={onFaviconPicked}
            onRemoved={onFaviconRemoved}
            dimensionsHint="Recommended 32×32px, PNG or ICO."
          />
        </div>
      </div>
    </section>
  );
}
