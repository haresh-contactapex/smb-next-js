"use client";

import { useEffect, useRef, useState } from "react";
import Breadcrumbs from "@/components/admin-panel/Breadcrumbs";
import Icon from "@/components/admin-panel/Icon";
import Toast from "@/components/add-product/Toast";
import SectionCard from "@/components/settings-shared/SectionCard";
import TextAreaField from "@/components/settings-shared/TextAreaField";
import ToggleField from "@/components/settings-shared/ToggleField";
import { ALL_PAGES_PATH, FOOTER_TEXT_MAX, normalizeFooterTextsInput, PATH_HINT } from "@/lib/footerTextRules";

// Keep in sync with AUTO_DISMISS_MS in the shared Add Product toast.
const TOAST_AUTO_DISMISS_MS = 10000;

const NO_ERRORS = {};
const DATALIST_ID = "footer-text-paths";

let nextKey = 0;
const newKey = () => `row-${nextKey++}`;

const toRows = (entries) =>
  entries.filter((entry) => entry.path !== ALL_PAGES_PATH).map((entry) => ({ key: newKey(), path: entry.path, content: entry.content, hidden: entry.hidden === true }));

const toBase = (entries) => {
  const entry = entries.find((item) => item.path === ALL_PAGES_PATH);
  return { content: entry?.content || "", hidden: entry?.hidden === true };
};

const toPayload = (base, rows) => [
  { path: ALL_PAGES_PATH, content: base.content, hidden: base.hidden },
  ...rows.map(({ path, content, hidden }) => ({ path, content, hidden })),
];

/**
 * CMS -> Footer Text. `entries` is the saved list ([{ path, content }], the all-pages
 * text first); `suggestions` are page addresses offered while typing ([{ path, label }]).
 * Rows are keyed so removing one never moves another's text or errors.
 */
export default function FooterTextForm({ entries, suggestions = [] }) {
  // The all-pages entry: { content, hidden }.
  const [base, setBase] = useState(() => toBase(entries));
  const [rows, setRows] = useState(() => toRows(entries));
  // Field errors: { default?: string, rows: { [rowKey]: { path?, content? } } }
  const [errors, setErrors] = useState(NO_ERRORS);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });

  const toastTimerRef = useRef(null);
  const savingRef = useRef(false);
  const initialSnapshot = useRef(JSON.stringify(toPayload(base, rows)));
  const dirty = JSON.stringify(toPayload(base, rows)) !== initialSnapshot.current;

  // Closing the tab or reloading with unsaved edits asks first.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function showToast(message, variant = "success") {
    setToast({ message, visible: true, variant });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), TOAST_AUTO_DISMISS_MS);
  }

  function dismissToast() {
    clearTimeout(toastTimerRef.current);
    setToast((t) => ({ ...t, visible: false }));
  }

  function updateRow(key, field, value) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
    // Editing a field clears its error; hiding a page clears a missing-text error too.
    const cleared = field === "hidden" ? "content" : field;
    setErrors((prev) => (prev.rows?.[key]?.[cleared] ? { ...prev, rows: { ...prev.rows, [key]: { ...prev.rows[key], [cleared]: undefined } } } : prev));
  }

  function addRow() {
    const key = newKey();
    setRows((prev) => [...prev, { key, path: "", content: "", hidden: false }]);
    // The new row's address field takes focus once it has rendered.
    setTimeout(() => document.getElementById(`footer-text-path-${key}`)?.focus(), 0);
  }

  function removeRow(key) {
    setRows((prev) => prev.filter((row) => row.key !== key));
    setErrors((prev) => {
      if (!prev.rows?.[key]) return prev;
      const { [key]: _removed, ...rest } = prev.rows;
      return { ...prev, rows: rest };
    });
  }

  // Server and client report errors by position in the payload (0 is the all-pages text).
  function showFieldErrors(byIndex, message) {
    const next = { default: byIndex[0]?.content, rows: {} };
    rows.forEach((row, i) => {
      if (byIndex[i + 1]) next.rows[row.key] = byIndex[i + 1];
    });
    setErrors(next);
    const firstRow = rows.find((row) => next.rows[row.key]);
    if (next.default) document.getElementById("footer-text-default")?.focus();
    else if (firstRow) {
      const field = next.rows[firstRow.key].path ? "path" : "content";
      document.getElementById(`footer-text-${field}-${firstRow.key}`)?.focus();
    }
    const first = Object.keys(byIndex)[0];
    showToast(message || (first !== undefined ? byIndex[first].path || byIndex[first].content : "Check the footer text and try again."), "error");
  }

  async function handleSave(event) {
    event?.preventDefault();
    if (savingRef.current) return;

    const payload = toPayload(base, rows);
    const { errors: fieldErrors } = normalizeFooterTextsInput(payload);
    if (Object.keys(fieldErrors).length) {
      showFieldErrors(fieldErrors);
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const res = await fetch("/api/cms/footer-texts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: payload }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        if (json?.errors) showFieldErrors(json.errors, json.error);
        else showToast(json?.error || "The footer text couldn't be saved.", "error");
        return;
      }

      // Take the server's version (cleaned addresses, sorted) as the new baseline.
      const nextBase = toBase(json.data);
      const nextRows = toRows(json.data);
      setBase(nextBase);
      setRows(nextRows);
      setErrors(NO_ERRORS);
      initialSnapshot.current = JSON.stringify(toPayload(nextBase, nextRows));
      showToast("Footer text saved.");
    } catch {
      showToast("The footer text couldn't be saved. Check your connection and try again.", "error");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} noValidate className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <Breadcrumbs icon="file-text" items={[{ label: "CMS" }, { label: "Footer Text" }]} />
          <h1 className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-white">Footer Text</h1>
        </div>
        <button
          type="submit"
          disabled={saving || !dirty}
          className="px-4 h-9 rounded-xl bg-primary-500 dark:bg-accent-500 hover:bg-primary-600 dark:hover:bg-accent-600 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed shrink-0 w-fit"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-3xl">
        The text under the storefront footer panel. A page listed below shows its own text; every other page shows the text for all other pages.
        Leave a blank line between paragraphs. Turn on <strong>Hide footer text</strong> to show no text there (the footer links stay). Changes go live as soon as you save.
      </p>

      <div className="space-y-6 max-w-4xl">
        <SectionCard title="All other pages">
          <ToggleField
            label="Hide footer text"
            description="Pages without their own entry below show no footer text."
            checked={base.hidden}
            onChange={(hidden) => {
              setBase((prev) => ({ ...prev, hidden }));
              setErrors((prev) => (prev.default ? { ...prev, default: undefined } : prev));
            }}
          />
          <TextAreaField
            id="footer-text-default"
            label="Footer text"
            value={base.content}
            onChange={(content) => {
              setBase((prev) => ({ ...prev, content }));
              setErrors((prev) => (prev.default ? { ...prev, default: undefined } : prev));
            }}
            rows={8}
            error={errors.default}
            disabled={base.hidden}
            hint={base.hidden ? "Hidden. The text is kept in case you show it again." : `${base.content.length} / ${FOOTER_TEXT_MAX} characters`}
          />
        </SectionCard>

        {rows.map((row, index) => {
          const rowErrors = errors.rows?.[row.key] || NO_ERRORS;
          return (
            <SectionCard key={row.key} title={row.path ? `Page ${row.path}` : `Page ${index + 1}`}>
              <div>
                <label className="field-label" htmlFor={`footer-text-path-${row.key}`}>Page address</label>
                <input
                  id={`footer-text-path-${row.key}`}
                  type="text"
                  list={DATALIST_ID}
                  value={row.path}
                  onChange={(event) => updateRow(row.key, "path", event.target.value)}
                  placeholder="/collections/eternity-bands"
                  autoComplete="off"
                  aria-invalid={rowErrors.path ? "true" : undefined}
                  className={`field-input${rowErrors.path ? " !border-red-400 focus:!border-red-400 !bg-red-50 focus:!bg-red-50 dark:!bg-red-500/10 dark:focus:!bg-red-500/10" : ""}`}
                />
                {rowErrors.path ? (
                  <p className="text-xs text-error mt-1">{rowErrors.path}</p>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">{PATH_HINT}</p>
                )}
              </div>
              <ToggleField
                label="Hide footer text"
                description="This page shows no footer text."
                checked={row.hidden}
                onChange={(hidden) => updateRow(row.key, "hidden", hidden)}
              />
              <TextAreaField
                id={`footer-text-content-${row.key}`}
                label="Footer text"
                value={row.content}
                onChange={(value) => updateRow(row.key, "content", value)}
                rows={8}
                error={rowErrors.content}
                disabled={row.hidden}
                hint={row.hidden ? "Hidden. The text is kept in case you show it again." : `${row.content.length} / ${FOOTER_TEXT_MAX} characters`}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <Icon name="trash-2" className="w-3.5 h-3.5" />
                  Remove this page
                </button>
              </div>
            </SectionCard>
          );
        })}

        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-dashed border-slate-300 dark:border-white/20 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
        >
          <Icon name="plus-circle" className="w-4 h-4" />
          Add a page
        </button>
      </div>

      <datalist id={DATALIST_ID}>
        {suggestions.map((suggestion) => (
          <option key={suggestion.path} value={suggestion.path}>
            {suggestion.label}
          </option>
        ))}
      </datalist>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </form>
  );
}
