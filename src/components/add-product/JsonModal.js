"use client";

export default function JsonModal({ open, json, onClose, onCopy, onDownload }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-darksurface rounded-2xl border border-slate-200 dark:border-white/10 shadow-popover w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-white/5">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">Product JSON</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
          >
            &times;
          </button>
        </div>
        <pre className="system-field text-xs leading-relaxed overflow-auto p-5 flex-1 whitespace-pre-wrap text-slate-700 dark:text-slate-200">
          {json}
        </pre>
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-100 dark:border-white/5">
          <button
            type="button"
            onClick={onCopy}
            className="px-3 h-9 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="px-4 h-9 rounded-xl bg-primary-500 dark:bg-accent-500 hover:bg-primary-600 dark:hover:bg-accent-600 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            Download .json
          </button>
        </div>
      </div>
    </div>
  );
}
