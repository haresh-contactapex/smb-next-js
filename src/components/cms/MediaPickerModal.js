"use client";

import { useEffect, useRef, useState } from "react";

const ACCEPTED_IMAGES = "image/jpeg,image/png,image/webp,image/gif";

// Dialog for the page editor's image button: choose a picture from the Media
// library or upload a new one (it is added to the library). Calls
// onSelect({ url, alt }) with the choice and onClose when dismissed.
export default function MediaPickerModal({ open, onSelect, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch("/api/media")
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (!json.success) throw new Error(json.error || "The Media library couldn't be loaded.");
        setItems(json.data.filter((item) => !item.mimeType || item.mimeType.startsWith("image/")));
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    dialogRef.current?.focus();
    const onKeyDown = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelled = true;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const altFor = (item) => item.altText || item.fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("purpose", "cms");
      const res = await fetch("/api/media", { method: "POST", body: formData });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "The image couldn't be uploaded.");
      onSelect({ url: json.data.url, alt: altFor(json.data) });
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cms-media-picker-title"
        tabIndex={-1}
        className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white shadow-popover outline-none dark:border-white/10 dark:bg-darksurface"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/5">
          <h2 id="cms-media-picker-title" className="text-base font-bold text-slate-800 dark:text-white">
            Insert image
          </h2>
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept={ACCEPTED_IMAGES} onChange={handleUpload} className="sr-only" tabIndex={-1} aria-label="Upload an image" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-9 rounded-xl bg-primary-500 px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-accent-500 dark:hover:bg-accent-600"
            >
              {uploading ? "Uploading…" : "Upload new image"}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-9 w-9 place-items-center rounded-xl text-xl leading-none text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="custom-scroll min-h-[200px] flex-1 overflow-y-auto p-5">
          {error && (
            <p role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-error dark:bg-red-500/10">
              {error}
            </p>
          )}
          {loading ? (
            <p className="py-10 text-center text-sm text-slate-400">Loading the Media library…</p>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No images in the Media library yet. Upload one to get started.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelect({ url: item.url, alt: altFor(item) })}
                    title={item.fileName}
                    className="group block w-full overflow-hidden rounded-xl border border-slate-200 text-left transition-colors hover:border-primary-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/20 dark:border-white/10 dark:hover:border-accent-500"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt="" loading="lazy" className="aspect-square w-full bg-slate-50 object-cover dark:bg-darksurface2" />
                    <span className="block truncate px-2 py-1.5 text-[11px] text-slate-500 dark:text-slate-400">{item.fileName}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
