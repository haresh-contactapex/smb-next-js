"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/admin-panel/Icon";

const DEFAULT_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

// WordPress-style "Select media" dialog with two tabs: pick existing images
// from the Media library (multi-select), or upload from the computer.
// Library picks go to onSelectItems(items); files chosen/dropped on the
// Upload tab go to onUploadFiles(fileList) — the caller decides how they're
// stored — and the dialog then closes.
export default function MediaSelectModal({
  open,
  onClose,
  onSelectItems,
  onUploadFiles,
  selectedUrls = [],
  title = "Add media",
  confirmLabel = "Add selected",
  accept = DEFAULT_ACCEPT,
  uploadHint = "JPEG, PNG, WEBP, or GIF images",
}) {
  const [tab, setTab] = useState("library");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState([]);
  const [search, setSearch] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const dialogRef = useRef(null);
  const fileInputRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setTab("library");
    setPicked([]);
    setSearch("");
    setError("");
    setLoading(true);

    fetch("/api/media")
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (!json.success) throw new Error(json.error || "The Media library couldn't be loaded.");
        const images = json.data.filter((item) => !item.mimeType || item.mimeType.startsWith("image/"));
        setItems(images);
        if (images.length === 0) setTab("upload");
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    dialogRef.current?.focus();
    const onKeyDown = (event) => event.key === "Escape" && onCloseRef.current();
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelled = true;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const used = useMemo(() => new Set(selectedUrls), [selectedUrls]);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? items.filter((item) => item.fileName.toLowerCase().includes(q)) : items;
  }, [items, search]);

  if (!open) return null;

  function togglePick(item) {
    setPicked((prev) => (prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]));
  }

  function handleConfirm() {
    const chosen = items.filter((item) => picked.includes(item.id));
    if (chosen.length) onSelectItems(chosen);
    onClose();
  }

  function handleFiles(fileList) {
    if (!fileList || !fileList.length) return;
    onUploadFiles(fileList);
    onClose();
  }

  function handleDrag(event, over) {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(over);
  }

  const tabClass = (name) =>
    `px-4 h-10 text-sm font-semibold border-b-2 -mb-px transition-colors ${
      tab === name
        ? "border-primary-500 text-primary-700 dark:border-accent-500 dark:text-white"
        : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
    }`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 dark:bg-black/60"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-select-title"
        tabIndex={-1}
        className="flex max-h-[88vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-200 bg-white shadow-popover outline-none dark:border-white/10 dark:bg-darksurface"
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-4">
          <h2 id="media-select-title" className="text-base font-bold text-slate-800 dark:text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-xl text-xl leading-none text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
          >
            &times;
          </button>
        </div>

        <div role="tablist" className="flex gap-1 border-b border-slate-100 px-5 dark:border-white/5">
          <button type="button" role="tab" aria-selected={tab === "library"} onClick={() => setTab("library")} className={tabClass("library")}>
            Media Library
          </button>
          <button type="button" role="tab" aria-selected={tab === "upload"} onClick={() => setTab("upload")} className={tabClass("upload")}>
            Upload files
          </button>
        </div>

        <div className="custom-scroll min-h-[280px] flex-1 overflow-y-auto p-5">
          {error && (
            <p role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-error dark:bg-red-500/10">
              {error}
            </p>
          )}

          {tab === "upload" ? (
            <div
              tabIndex={0}
              role="button"
              aria-label="Upload files from your computer"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragEnter={(e) => handleDrag(e, true)}
              onDragOver={(e) => handleDrag(e, true)}
              onDragLeave={(e) => handleDrag(e, false)}
              onDrop={(e) => {
                handleDrag(e, false);
                handleFiles(e.dataTransfer.files);
              }}
              className={`flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors hover:border-primary-400 dark:hover:border-accent-500/50 ${
                dragOver
                  ? "border-primary-400 bg-primary-50 dark:border-accent-500/50 dark:bg-white/5"
                  : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-darksurface2/40"
              }`}
            >
              <Icon name="upload-cloud" className="mb-2 h-10 w-10 text-slate-400" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Drop files to upload</p>
              <p className="mt-1 text-xs text-slate-400">
                or <span className="font-semibold text-primary-600 underline dark:text-accent-400">select files from your computer</span>
              </p>
              <p className="mt-1 text-xs text-slate-400">{uploadHint}</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={accept}
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
                onChange={(e) => {
                  handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          ) : loading ? (
            <p className="py-16 text-center text-sm text-slate-400">Loading the Media library…</p>
          ) : items.length === 0 ? (
            <div className="py-16 text-center">
              <Icon name="image" className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-400">No images in the Media library yet.</p>
              <button
                type="button"
                onClick={() => setTab("upload")}
                className="mt-3 text-sm font-semibold text-primary-600 underline dark:text-accent-400"
              >
                Upload files
              </button>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center gap-3">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search media…"
                  aria-label="Search the Media library"
                  className="h-9 w-full max-w-xs rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-primary-400 dark:border-white/10 dark:bg-darksurface2/40 dark:text-slate-200"
                />
                <span className="text-xs text-slate-400">{visible.length} images</span>
              </div>
              {visible.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">No images match “{search}”.</p>
              ) : (
                <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                  {visible.map((item) => {
                    const isUsed = used.has(item.url);
                    const isPicked = picked.includes(item.id);
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => togglePick(item)}
                          disabled={isUsed}
                          aria-pressed={isPicked}
                          title={isUsed ? `${item.fileName} (already added)` : item.fileName}
                          className={`group relative block aspect-square w-full overflow-hidden rounded-xl border-2 bg-slate-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/20 disabled:cursor-not-allowed dark:bg-darksurface2/60 ${
                            isPicked
                              ? "border-primary-500 dark:border-accent-500"
                              : "border-slate-200 hover:border-primary-300 dark:border-white/10 dark:hover:border-accent-500/50"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- Vercel Blob / uploads URLs, not optimizable by next/image */}
                          <img
                            src={item.url}
                            alt={item.altText || item.fileName}
                            loading="lazy"
                            className={`h-full w-full object-cover${isUsed ? " opacity-40" : ""}`}
                          />
                          {isPicked && (
                            <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-primary-500 text-white shadow dark:bg-accent-500">
                              <Icon name="check" className="h-3.5 w-3.5" />
                            </span>
                          )}
                          {isUsed && (
                            <span className="absolute inset-x-0 bottom-0 bg-slate-900/70 px-1.5 py-1 text-center text-[10px] font-semibold text-white">
                              Already added
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>

        {tab === "library" && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5 dark:border-white/5">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {picked.length ? `${picked.length} selected` : "Select one or more images"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-9 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={picked.length === 0}
                className="h-9 rounded-xl bg-primary-500 px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-accent-500 dark:hover:bg-accent-600"
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
