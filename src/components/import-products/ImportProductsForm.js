"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/admin-panel/Icon";
import ImportToolbar from "./ImportToolbar";
import Toast from "./Toast";
import {
  REQUIRED_COLUMNS,
  OPTIONAL_COLUMNS,
  VARIANT_COLUMNS,
  buildSampleCsv,
  buildVariableSampleCsv,
  buildFailedRowsCsv,
  downloadCsv,
} from "./helpers";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const TOAST_AUTO_DISMISS_MS = 10000;

function formatSize(bytes) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImportProductsForm() {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });

  const fileInputRef = useRef(null);
  const toastTimerRef = useRef(null);
  const importingRef = useRef(false);

  function showToast(message, variant = "success") {
    setToast({ message, visible: true, variant });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), TOAST_AUTO_DISMISS_MS);
  }

  function dismissToast() {
    clearTimeout(toastTimerRef.current);
    setToast((t) => ({ ...t, visible: false }));
  }

  function handleFilesPicked(fileList) {
    const picked = fileList?.[0];
    if (!picked) return;

    if (!picked.name.toLowerCase().endsWith(".csv")) {
      showToast(`${picked.name}: only .csv files are allowed`, "error");
      return;
    }
    if (picked.size > MAX_SIZE_BYTES) {
      showToast(`${picked.name}: file must be 5MB or smaller`, "error");
      return;
    }

    setFile(picked);
    setResult(null);
  }

  function handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }
  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }
  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleFilesPicked(e.dataTransfer.files);
  }

  function handleRemoveFile() {
    setFile(null);
    setResult(null);
  }

  async function handleImport() {
    if (!file || importingRef.current) return;
    importingRef.current = true;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/products/import", { method: "POST", body: formData });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to import products");

      setResult(json.data);
      const { created, failed } = json.data;
      if (failed.length === 0) {
        showToast(`Imported ${created} product${created === 1 ? "" : "s"}`);
      } else {
        showToast(`Imported ${created} product${created === 1 ? "" : "s"}, ${failed.length} row(s) failed`, "error");
      }
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      importingRef.current = false;
      setImporting(false);
    }
  }

  function handleDownloadTemplate() {
    downloadCsv("product-import-template.csv", buildSampleCsv());
  }

  function handleDownloadVariableTemplate() {
    downloadCsv("product-import-variable-template.csv", buildVariableSampleCsv());
  }

  function handleDownloadErrors() {
    if (!result?.failed?.length) return;
    downloadCsv("product-import-errors.csv", buildFailedRowsCsv(result.failed));
  }

  return (
    <>
      <ImportToolbar
        onDownloadTemplate={handleDownloadTemplate}
        onDownloadVariableTemplate={handleDownloadVariableTemplate}
      />

      <div className="max-w-3xl space-y-6 mt-6">
        <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-1">Upload CSV file</h2>
          <p className="text-xs text-slate-400 mb-1.5">
            Required columns: <span className="font-mono">{REQUIRED_COLUMNS.join(", ")}</span>. Optional:{" "}
            <span className="font-mono">{OPTIONAL_COLUMNS.join(", ")}</span>. Separate multiple tags, collections, or
            image URLs within a cell with a semicolon (<span className="font-mono">;</span>), and write category paths
            as <span className="font-mono">Parent &gt; Child</span>.
          </p>
          <p className="text-xs text-slate-400 mb-3">
            For a product with variants (e.g. Size/Color), give every row of that product the same{" "}
            <span className="font-mono">handle</span> and add: <span className="font-mono">{VARIANT_COLUMNS.join(", ")}</span>.
            Only the first row of a handle needs the product-level columns above — leave them blank on the rest.
          </p>

          {!file ? (
            <div
              tabIndex={0}
              role="button"
              aria-label="Upload a CSV file"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors hover:border-primary-400 dark:hover:border-accent-500/50 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-darksurface2/40${
                dragOver ? " border-primary-400 dark:border-accent-500/50" : ""
              }`}
            >
              <Icon name="upload-cloud" className="w-10 h-10 text-slate-400 mb-2" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Drag and drop a CSV file</p>
              <p className="text-xs text-slate-400 mt-1">
                or <span className="text-primary-600 dark:text-accent-400 font-semibold underline">browse files</span>{" "}
                — .csv, up to 5MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                aria-hidden="true"
                onChange={(e) => {
                  handleFilesPicked(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 bg-slate-50 dark:bg-darksurface2/40">
              <div className="flex items-center gap-3 min-w-0">
                <Icon name="file-text" className="w-5 h-5 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{file.name}</p>
                  <p className="text-xs text-slate-400">{formatSize(file.size)}</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Remove file"
                onClick={handleRemoveFile}
                disabled={importing}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-50 shrink-0"
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={handleImport}
              disabled={!file || importing}
              className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-primary-500 dark:bg-accent-500 hover:bg-primary-600 dark:hover:bg-accent-600 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {importing ? "Importing…" : "Import products"}
            </button>
          </div>
        </section>

        {result && (
          <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">Import summary</h2>
              <button
                type="button"
                onClick={() => router.push("/all-products")}
                className="text-xs font-semibold text-primary-600 dark:text-accent-400 hover:underline"
              >
                View all products
              </button>
            </div>

            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 mb-2">
              <Icon name="check-circle" className="w-4 h-4" />
              {result.created} product{result.created === 1 ? "" : "s"} imported
            </div>

            {result.failed.length > 0 && (
              <>
                <div className="flex items-center justify-between gap-3 mt-4 mb-2">
                  <div className="flex items-center gap-2 text-sm text-error">
                    <Icon name="x-circle" className="w-4 h-4" />
                    {result.failed.length} row{result.failed.length === 1 ? "" : "s"} failed
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadErrors}
                    className="text-xs font-semibold text-primary-600 dark:text-accent-400 hover:underline"
                  >
                    Download error report
                  </button>
                </div>
                <div className="overflow-x-auto border border-slate-200 dark:border-white/10 rounded-xl">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-darksurface2/60 text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="text-left font-semibold px-3 py-2">Row</th>
                        <th className="text-left font-semibold px-3 py-2">Title</th>
                        <th className="text-left font-semibold px-3 py-2">SKU</th>
                        <th className="text-left font-semibold px-3 py-2">Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {result.failed.map((f) => (
                        <tr key={f.row}>
                          <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{f.row}</td>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{f.title || "—"}</td>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{f.sku || "—"}</td>
                          <td className="px-3 py-2 text-error">{f.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}
      </div>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </>
  );
}
