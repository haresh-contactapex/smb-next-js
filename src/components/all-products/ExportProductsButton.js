"use client";

import { useRef, useState } from "react";
import Icon from "@/components/admin-panel/Icon";

const ERROR_AUTO_DISMISS_MS = 6000;

function downloadCsv(filename, csvText) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function ExportProductsButton() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const errorTimerRef = useRef(null);
  const exportingRef = useRef(false);

  async function handleExport() {
    if (exportingRef.current) return;
    exportingRef.current = true;
    setExporting(true);
    setError("");
    try {
      const res = await fetch("/api/products/export");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to export products");
      downloadCsv(json.data.filename, json.data.csv);
    } catch (err) {
      setError(err.message);
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => setError(""), ERROR_AUTO_DISMISS_MS);
    } finally {
      exportingRef.current = false;
      setExporting(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleExport}
        disabled={exporting}
        className="inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed w-fit"
      >
        <Icon name="download" className="w-4 h-4" />
        {exporting ? "Exporting…" : "Export"}
      </button>
      {error && (
        <p role="alert" className="absolute top-full right-0 mt-1 text-xs text-error whitespace-nowrap z-10">
          {error}
        </p>
      )}
    </div>
  );
}
