"use client";

import { useEffect, useRef } from "react";
import { sanitizeCmsHtml } from "@/lib/sanitizeHtml";
import { CMS_ADMIN_PROSE } from "./prose";

// Shows the page as it is being edited (not yet saved), cleaned with the same
// rules the server applies. The storefront's own fonts and spacing differ a little.
export default function CmsPreviewModal({ open, title, contentHtml, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    dialogRef.current?.focus();
    const onKeyDown = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cms-preview-heading"
        tabIndex={-1}
        className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-200 bg-white shadow-popover outline-none dark:border-white/10 dark:bg-darksurface"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-white/5">
          <h2 id="cms-preview-heading" className="text-sm font-bold text-slate-800 dark:text-white">Preview (unsaved)</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="grid h-9 w-9 place-items-center rounded-xl text-xl leading-none text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
          >
            &times;
          </button>
        </div>
        <div className="custom-scroll flex-1 overflow-y-auto px-6 py-6">
          <h1 className="mb-4 text-center text-2xl font-semibold text-slate-800 dark:text-white">
            {title || "Untitled page"}
          </h1>
          {contentHtml.trim() ? (
            <div className={CMS_ADMIN_PROSE} dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(contentHtml) }} />
          ) : (
            <p className="text-center text-sm text-slate-400">This page has no content yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
