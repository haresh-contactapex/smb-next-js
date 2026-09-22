"use client";

import { useState } from "react";
import Icon from "@/components/admin-panel/Icon";

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaDetailsModal({ item, deleting, onClose, onDelete }) {
  const [copied, setCopied] = useState(false);

  if (!item) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !deleting) onClose();
      }}
    >
      <div className="relative bg-white dark:bg-darksurface rounded-2xl border border-slate-200 dark:border-white/10 shadow-popover w-full max-w-2xl max-h-[85vh] flex flex-col">
        {deleting && (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/90 dark:bg-darksurface/90 rounded-2xl"
          >
            <Icon name="refresh-cw" className="w-7 h-7 text-primary-500 dark:text-accent-500 animate-spin" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Deleting…</p>
          </div>
        )}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-white/5">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white truncate pr-4">{item.fileName}</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            &times;
          </button>
        </div>
        <div className="flex-1 overflow-auto p-5 flex flex-col md:flex-row gap-5">
          <div className="md:w-1/2 shrink-0 bg-slate-100 dark:bg-darksurface2/60 rounded-xl overflow-hidden flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- served from public/uploads, arbitrary runtime paths */}
            <img src={item.url} alt={item.altText || item.fileName} className="max-w-full max-h-80 object-contain" />
          </div>
          <div className="md:w-1/2 space-y-3 text-sm">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase mb-1">File name</p>
              <p className="text-slate-700 dark:text-slate-200 break-all">{item.fileName}</p>
            </div>
            {item.mimeType && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Type</p>
                <p className="text-slate-700 dark:text-slate-200">{item.mimeType}</p>
              </div>
            )}
            {item.sizeBytes != null && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Size</p>
                <p className="text-slate-700 dark:text-slate-200">{formatSize(item.sizeBytes)}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase mb-1">URL</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={item.url}
                  className="system-field flex-1 text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-darksurface2/40 text-slate-600 dark:text-slate-300"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 h-8 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors inline-flex items-center gap-1.5 shrink-0"
                >
                  <Icon name="copy" className="w-3.5 h-3.5" />
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-100 dark:border-white/5">
          <button
            type="button"
            onClick={() => onDelete(item)}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 px-4 h-9 rounded-xl border border-red-200 dark:border-red-500/30 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {deleting && <Icon name="refresh-cw" className="w-3.5 h-3.5 animate-spin" />}
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
