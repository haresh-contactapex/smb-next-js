"use client";

import { Suspense, useEffect, useState } from "react";
import Icon from "@/components/admin-panel/Icon";
import SectionCard from "@/components/settings-shared/SectionCard";
import TextField from "@/components/settings-shared/TextField";
import { ENGRAVING_SAMPLE_TEXT, MAX_ENGRAVING_FONTS, engravingFontsHref } from "@/lib/engravingRules";
import { ADD_FONT_ID, countFonts, fontFieldId, fontLabel } from "./helpers";

const ICON_BUTTON =
  "inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/20 dark:focus-visible:ring-accent-500/30 disabled:opacity-40 disabled:pointer-events-none transition-colors";

// Loads the Google fonts the list names so the previews use the real typefaces, the same way
// the storefront's GoogleSansFont does. `precedence` makes React hoist the link into <head> and
// de-duplicate it. Nothing is rendered when no font names a Google font.
function FontStylesheets({ href }) {
  if (!href) return null;
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={href} precedence="default" />
    </>
  );
}

// The stylesheet address changes with every letter typed into a "Google Fonts name" field. This
// waits for a pause in typing before asking Google for the new family, and applies the very first
// address at once.
function useSettledValue(value, delayMs) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    if (value === settled) return undefined;
    if (settled == null) {
      setSettled(value);
      return undefined;
    }
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, settled, delayMs]);
  return settled;
}

function FontRow({ font, index, total, open, errors, disabled, onChange, onToggleOpen, onMove, onDelete }) {
  const label = fontLabel(font);
  const panelId = fontFieldId(font.key, "panel");
  const hasError = Object.values(errors).some(Boolean);

  return (
    <li
      className={`rounded-xl border bg-white dark:bg-darksurface ${
        hasError ? "border-red-300 dark:border-red-500/40" : "border-slate-200 dark:border-white/10"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
        <span aria-hidden="true" className="w-5 shrink-0 text-xs font-semibold tabular-nums text-slate-400">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1 basis-40">
          <p
            className={`truncate text-2xl leading-snug text-slate-800 dark:text-white${font.enabled ? "" : " opacity-50"}`}
            style={{ fontFamily: font.fontFamily || undefined }}
          >
            {ENGRAVING_SAMPLE_TEXT}
          </p>
          <div className="flex items-center gap-2 min-w-0">
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{font.name.trim() || "Untitled font"}</p>
            {!font.enabled && (
              <span className="shrink-0 rounded-full bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Disabled
              </span>
            )}
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1 sm:gap-1.5">
          <label className="inline-flex h-8 sm:h-9 cursor-pointer items-center gap-1.5 rounded-lg px-1.5 sm:px-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              className="w-4 h-4 rounded accent-primary-500 dark:accent-accent-500 shrink-0"
              checked={font.enabled}
              disabled={disabled}
              onChange={(e) => onChange(font.key, "enabled", e.target.checked)}
              aria-label={`${label} enabled`}
            />
            Enabled
          </label>
          <button
            type="button"
            id={fontFieldId(font.key, "up")}
            className={ICON_BUTTON}
            aria-label={`Move ${label} up`}
            title="Move up"
            disabled={disabled || index === 0}
            onClick={() => onMove(font, index, -1)}
          >
            <Icon name="chevron-up" className="w-4 h-4" />
          </button>
          <button
            type="button"
            id={fontFieldId(font.key, "down")}
            className={ICON_BUTTON}
            aria-label={`Move ${label} down`}
            title="Move down"
            disabled={disabled || index === total - 1}
            onClick={() => onMove(font, index, 1)}
          >
            <Icon name="chevron-down" className="w-4 h-4" />
          </button>
          <button
            type="button"
            id={fontFieldId(font.key, "edit")}
            className="inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/10 px-2 sm:px-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/20 dark:focus-visible:ring-accent-500/30 transition-colors"
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={`${open ? "Done editing" : "Edit"} ${label}`}
            onClick={() => onToggleOpen(font.key)}
          >
            <Icon name={open ? "check" : "edit-2"} className="w-3.5 h-3.5" />
            {open ? "Done" : "Edit"}
          </button>
          <button
            type="button"
            className={`${ICON_BUTTON} hover:!text-error hover:!bg-red-50 dark:hover:!bg-red-500/10`}
            aria-label={`Delete ${label}`}
            title="Delete"
            disabled={disabled}
            onClick={() => onDelete(font)}
          >
            <Icon name="trash-2" className="w-4 h-4" />
          </button>
        </div>
      </div>

      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={`${label} settings`}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] rounded-b-xl p-3 sm:p-4"
        >
          <TextField
            id={fontFieldId(font.key, "name")}
            label="Font name"
            value={font.name}
            onChange={(value) => onChange(font.key, "name", value)}
            placeholder="Elegant Script"
            hint="Shown to customers and printed on the order."
            error={errors.name}
            disabled={disabled}
          />
          <TextField
            id={fontFieldId(font.key, "fontFamily")}
            label="Font family (CSS)"
            value={font.fontFamily}
            onChange={(value) => onChange(font.key, "fontFamily", value)}
            placeholder="Allura, cursive"
            hint="Add a fallback after the comma, such as cursive or sans-serif."
            error={errors.fontFamily}
            disabled={disabled}
          />
          <div className="sm:col-span-2">
            <TextField
              id={fontFieldId(font.key, "googleFont")}
              label="Google Fonts name (optional)"
              value={font.googleFont}
              onChange={(value) => onChange(font.key, "googleFont", value)}
              placeholder="Allura"
              hint="Loads the font for the preview and the storefront. Leave empty for system fonts like Arial."
              error={errors.googleFont}
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </li>
  );
}

export default function FontsSection({
  fonts,
  errors,
  openKeys,
  engravingEnabled,
  disabled = false,
  status = "ready",
  onChange,
  onToggleOpen,
  onAdd,
  onMove,
  onDelete,
}) {
  const [announcement, setAnnouncement] = useState("");
  const counts = countFonts(fonts);
  const stylesheetHref = useSettledValue(engravingFontsHref(fonts), 700);
  const atLimit = fonts.length >= MAX_ENGRAVING_FONTS;
  const showNoFontWarning = status === "ready" && engravingEnabled && counts.enabled === 0;

  function handleMove(font, index, delta) {
    onMove(font.key, delta);
    setAnnouncement(`${fontLabel(font)} moved to position ${index + delta + 1} of ${fonts.length}.`);
  }

  function handleDelete(font) {
    const message = `Delete "${fontLabel(font)}"?\n\nIt is removed from the list when you save. Past orders keep their own copy of the font name, so they will not change.`;
    if (!window.confirm(message)) return;
    onDelete(font.key);
    setAnnouncement(`${fontLabel(font)} deleted.`);
  }

  return (
    <SectionCard title="Engraving Fonts">
      <Suspense fallback={null}>
        <FontStylesheets href={stylesheetHref} />
      </Suspense>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Customers choose one of the enabled fonts for their engraving, in the order listed here. Past orders keep their
        own copy of the font name, so editing or deleting a font never changes an order that was already placed.
      </p>

      <div aria-live="polite">
        {showNoFontWarning && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            <Icon name="alert-triangle" className="w-4 h-4 shrink-0 mt-px" />
            <span>Engraving is hidden on product pages until at least one font is enabled.</span>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        {counts.total} {counts.total === 1 ? "font" : "fonts"}, {counts.enabled} enabled
      </p>

      {fonts.length > 0 ? (
        <ul className="space-y-2">
          {fonts.map((font, index) => (
            <FontRow
              key={font.key}
              font={font}
              index={index}
              total={fonts.length}
              open={openKeys.has(font.key)}
              errors={errors[font.key] || {}}
              disabled={disabled}
              onChange={onChange}
              onToggleOpen={onToggleOpen}
              onMove={handleMove}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 dark:border-white/15 px-4 py-5 text-center text-sm text-slate-500 dark:text-slate-400">
          {status === "loading"
            ? "Loading fonts..."
            : status === "error"
              ? "Fonts could not be loaded."
              : "No fonts yet. Add one so customers can choose how their engraving looks."}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          id={ADD_FONT_ID}
          onClick={onAdd}
          disabled={disabled || atLimit}
          className="inline-flex h-10 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-dashed border-primary-300 dark:border-accent-500/50 px-4 text-sm font-semibold text-primary-600 dark:text-accent-400 hover:bg-primary-50 dark:hover:bg-accent-500/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/20 dark:focus-visible:ring-accent-500/30 disabled:opacity-50 disabled:pointer-events-none transition-colors"
        >
          <Icon name="plus-circle" className="w-4 h-4" />
          Add font
        </button>
        {atLimit && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            You have reached the limit of {MAX_ENGRAVING_FONTS} fonts.
          </p>
        )}
      </div>

      <p className="sr-only" role="status">
        {announcement}
      </p>
    </SectionCard>
  );
}
