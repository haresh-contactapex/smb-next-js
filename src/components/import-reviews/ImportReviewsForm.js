"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/admin-panel/Icon";
import ProductSearchField from "@/components/add-review/ProductSearchField";
import { useCan } from "@/components/providers/StaffPermissionsProvider";
import Toast from "@/components/add-product/Toast";
import { REVIEW_STATUSES, STATUS_LABELS } from "@/lib/reviewFields";
import ImportPreview from "./ImportPreview";
import ImportReviewsToolbar from "./ImportReviewsToolbar";
import { ACCEPT_ATTRIBUTE, FORMAT_EXAMPLE, formatSize, validateFile } from "./helpers";

// Keep in sync with AUTO_DISMISS_MS in the shared Add Product toast.
const TOAST_AUTO_DISMISS_MS = 10000;

const CARD = "bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5";
const PRIMARY_BUTTON =
  "inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-primary-500 dark:bg-accent-500 hover:bg-primary-600 dark:hover:bg-accent-600 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
const SECONDARY_BUTTON =
  "inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

export default function ImportReviewsForm() {
  const can = useCan();
  const canApprove = can("reviews.approve");

  const [product, setProduct] = useState(null); // { id, title }
  const [file, setFile] = useState(null);
  // Imported reviews are published straight away for those who may approve;
  // everyone else is limited to Pending (the server enforces it regardless).
  const [status, setStatus] = useState(canApprove ? "APPROVED" : "PENDING");
  const [errors, setErrors] = useState({});
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(null); // null | "preview" | "import"
  const [preview, setPreview] = useState(null);
  const [confirmMismatch, setConfirmMismatch] = useState(false);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });

  const fileInputRef = useRef(null);
  const productInputRef = useRef(null);
  const previewHeadingRef = useRef(null);
  const toastTimerRef = useRef(null);
  const busyRef = useRef(false);

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  // Bring the preview into view (and announce it) once it has been built.
  useEffect(() => {
    if (preview && previewHeadingRef.current) {
      previewHeadingRef.current.focus({ preventScroll: true });
      previewHeadingRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [preview]);

  function showToast(message, variant = "success") {
    setToast({ message, visible: true, variant });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), TOAST_AUTO_DISMISS_MS);
  }

  function dismissToast() {
    clearTimeout(toastTimerRef.current);
    setToast((t) => ({ ...t, visible: false }));
  }

  // A preview describes one file for one product; changing either makes it stale.
  function discardPreview() {
    setPreview(null);
    setConfirmMismatch(false);
    setResult(null);
  }

  function handleProductSelect(selected) {
    setProduct({ id: selected.id, title: selected.title });
    setErrors((prev) => ({ ...prev, product: undefined }));
    discardPreview();
  }

  function handleProductClear() {
    setProduct(null);
    discardPreview();
  }

  function handleFilePicked(fileList) {
    const picked = fileList?.[0];
    if (!picked) return;
    const problem = validateFile(picked);
    if (problem) {
      setErrors((prev) => ({ ...prev, file: problem }));
      showToast(problem, "error");
      return;
    }
    setFile(picked);
    setErrors((prev) => ({ ...prev, file: undefined }));
    discardPreview();
  }

  function handleRemoveFile() {
    setFile(null);
    discardPreview();
  }

  function handleDragOver(e) {
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
    if (e.dataTransfer.files.length) handleFilePicked(e.dataTransfer.files);
  }

  async function send(dryRun) {
    const body = new FormData();
    body.append("file", file);
    body.append("productId", product.id);
    body.append("status", status);
    body.append("dryRun", dryRun ? "true" : "false");
    body.append("confirmMismatch", confirmMismatch ? "true" : "false");

    const res = await fetch("/api/reviews/import", { method: "POST", body });
    let json;
    try {
      json = await res.json();
    } catch {
      throw new Error(`The server couldn't process the upload (HTTP ${res.status}).`);
    }
    if (!res.ok || !json.success) throw new Error(json.error || "The import failed. Try again.");
    return json.data;
  }

  async function run(kind, task) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(kind);
    try {
      await task();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  }

  function handlePreview() {
    const found = {};
    if (!product) found.product = "Search for the product and pick it from the suggestions.";
    if (!file) found.file = "Choose a Word file (.docx or .doc) to import.";
    setErrors(found);
    if (found.product || found.file) {
      if (found.product) productInputRef.current?.focus();
      else fileInputRef.current?.parentElement?.focus();
      showToast("Choose a product and a Word file first", "error");
      return;
    }
    run("preview", async () => {
      setPreview(null);
      setConfirmMismatch(false);
      setPreview(await send(true));
    });
  }

  function handleImport() {
    if (!preview) return;
    run("import", async () => {
      const data = await send(false);
      setPreview(null);
      setResult(data);
      showToast(`Imported ${data.imported} review${data.imported === 1 ? "" : "s"}`);
    });
  }

  function handleImportAnother() {
    setFile(null);
    discardPreview();
  }

  const mismatch = preview?.productCheck.status === "mismatch";
  const importable = preview?.counts.importable ?? 0;
  const canImport = Boolean(preview) && importable > 0 && (!mismatch || confirmMismatch) && !busy;

  return (
    <>
      <ImportReviewsToolbar />

      <div className="max-w-5xl space-y-6 mt-6">
        <section className={CARD}>
          <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-1">1. Product</h2>
          <p className="text-xs text-slate-400 mb-3">Every review in the file is added to this product only.</p>
          <label className="field-label" htmlFor="f-product">
            Product
          </label>
          <ProductSearchField
            selectedId={product?.id ?? ""}
            selectedTitle={product?.title ?? ""}
            error={errors.product}
            inputRef={(element) => {
              productInputRef.current = element;
            }}
            onSelect={handleProductSelect}
            onClear={handleProductClear}
          />
          {errors.product ? (
            <p id="f-product-error" className="text-xs text-error mt-1">
              {errors.product}
            </p>
          ) : (
            <p id="f-product-help" className="text-[11px] text-slate-400 mt-1.5">
              Start typing a product name or SKU, then pick it from the suggestions.
            </p>
          )}

          <div className="mt-4 sm:max-w-xs">
            <label className="field-label" htmlFor="f-import-status">
              Status of imported reviews
            </label>
            <div className="relative">
              <select
                id="f-import-status"
                value={status}
                disabled={!canApprove || Boolean(busy)}
                onChange={(e) => {
                  setStatus(e.target.value);
                  discardPreview();
                }}
                aria-describedby="f-import-status-help"
                className="field-input appearance-none pr-8 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                {REVIEW_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
                <Icon name="chevron-down" className="w-4 h-4" />
              </span>
            </div>
            <p id="f-import-status-help" className="text-[11px] text-slate-400 mt-1.5">
              {canApprove
                ? "Only Approved reviews are shown on the storefront."
                : "You don't have permission to approve reviews, so they are imported as Pending."}
            </p>
          </div>
        </section>

        <section className={CARD}>
          <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-1">2. Word file</h2>
          <p className="text-xs text-slate-400 mb-3">
            A Word document (<span className="font-mono">.docx</span> or <span className="font-mono">.doc</span>, up to 4
            MB) with one rating line, a reviewer name and the review text for each review.
          </p>

          {!file ? (
            <div
              tabIndex={0}
              role="button"
              aria-label="Upload a Word file"
              aria-describedby={errors.file ? "f-file-error" : undefined}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragEnter={handleDragOver}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors hover:border-primary-400 dark:hover:border-accent-500/50 ${
                errors.file
                  ? "border-red-400 bg-red-50 dark:bg-red-500/10"
                  : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-darksurface2/40"
              }${dragOver ? " !border-primary-400 dark:!border-accent-500/50" : ""}`}
            >
              <Icon name="upload-cloud" className="w-10 h-10 text-slate-400 mb-2" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Drag and drop a Word file</p>
              <p className="text-xs text-slate-400 mt-1">
                or <span className="text-primary-600 dark:text-accent-400 font-semibold underline">browse files</span>{" "}
                — .docx or .doc, up to 4MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_ATTRIBUTE}
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
                onChange={(e) => {
                  handleFilePicked(e.target.files);
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
                disabled={Boolean(busy)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-50 shrink-0"
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>
          )}
          {errors.file && (
            <p id="f-file-error" className="text-xs text-error mt-1.5">
              {errors.file}
            </p>
          )}

          <details className="mt-4 group">
            <summary className="cursor-pointer text-xs font-semibold text-primary-600 dark:text-accent-400 select-none">
              What should the document look like?
            </summary>
            <div className="mt-2 space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <pre className="overflow-x-auto custom-scroll rounded-xl bg-slate-50 dark:bg-darksurface2/60 border border-slate-200 dark:border-white/10 p-3 font-mono text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                {FORMAT_EXAMPLE}
              </pre>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  A review starts at a line with stars and/or a score such as <span className="font-mono">5/5</span> or{" "}
                  <span className="font-mono">4.5 out of 5</span>. Whole and half stars from 0.5 to 5 are accepted.
                </li>
                <li>
                  The name can also sit on the rating line (<span className="font-mono">★★★★★ 5/5 – Onica P.</span>).
                  Optional <span className="font-mono">Title:</span> and <span className="font-mono">Email:</span> lines
                  are used when present.
                </li>
                <li>
                  Without a title, one is made from the first sentence of the review. Without an email, a placeholder
                  address is stored — reviews don&apos;t show it on the storefront, and you can edit it later.
                </li>
                <li>
                  Reviews that already exist for the product (same reviewer and text) are skipped, so importing the same
                  file twice is safe.
                </li>
              </ul>
            </div>
          </details>

          <div className="flex justify-end mt-4">
            <button type="button" onClick={handlePreview} disabled={Boolean(busy)} className={PRIMARY_BUTTON}>
              {busy === "preview" ? "Reading document…" : "Preview import"}
            </button>
          </div>
        </section>

        <p className="sr-only" role="status" aria-live="polite">
          {busy === "preview" ? "Reading the document." : busy === "import" ? "Importing reviews." : ""}
        </p>

        {preview && (
          <section className={CARD} aria-labelledby="import-preview-heading">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="min-w-0">
                <h2
                  id="import-preview-heading"
                  ref={previewHeadingRef}
                  tabIndex={-1}
                  className="text-sm font-bold text-slate-800 dark:text-white focus:outline-none"
                >
                  3. Preview
                </h2>
                <p className="text-xs text-slate-400 truncate">
                  {preview.fileName} → “{preview.product.title}” as {STATUS_LABELS[preview.status]}
                </p>
              </div>
            </div>

            <ImportPreview
              preview={preview}
              confirmMismatch={confirmMismatch}
              onConfirmMismatchChange={setConfirmMismatch}
              disabled={Boolean(busy)}
            />

            <div className="flex flex-wrap justify-end gap-2 mt-5">
              <button type="button" onClick={discardPreview} disabled={Boolean(busy)} className={SECONDARY_BUTTON}>
                Cancel
              </button>
              <button type="button" onClick={handleImport} disabled={!canImport} className={PRIMARY_BUTTON}>
                {busy === "import"
                  ? "Importing…"
                  : importable === 0
                    ? "Nothing to import"
                    : `Import ${importable} review${importable === 1 ? "" : "s"}`}
              </button>
            </div>
          </section>
        )}

        {result && (
          <section className={CARD} aria-live="polite">
            <div className="flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-400 mb-1">
              <Icon name="check-circle" className="w-4 h-4" />
              {result.imported} review{result.imported === 1 ? "" : "s"} imported into “{result.product.title}”
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Added as {STATUS_LABELS[result.status]}.
              {result.counts.total - result.imported > 0 &&
                ` ${result.counts.total - result.imported} skipped (${result.counts.duplicates} duplicate${
                  result.counts.duplicates === 1 ? "" : "s"
                }, ${result.counts.withErrors} with errors).`}
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Link href="/admin/all-reviews" className={PRIMARY_BUTTON}>
                View all reviews
              </Link>
              <button type="button" onClick={handleImportAnother} className={SECONDARY_BUTTON}>
                Import another file
              </button>
            </div>
          </section>
        )}
      </div>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </>
  );
}
