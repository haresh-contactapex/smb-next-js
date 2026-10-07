"use client";

import { useEffect, useRef, useState } from "react";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "./Toast";
import GeneralSection from "./GeneralSection";
import CategoriesSection from "./CategoriesSection";
import FontsSection from "./FontsSection";
import {
  ADD_FONT_ID,
  NO_ERRORS,
  applyServerFieldError,
  blankFont,
  fontFieldId,
  focusControl,
  moveItem,
  settingErrorKey,
  toCategoryList,
  toFormState,
  toSavePayload,
  validateEngravingForm,
} from "./helpers";

const API_URL = "/api/settings/engraving";

function errorMessage(error, fallback) {
  // fetch() itself failed (offline, server down), as opposed to the server answering with an error.
  if (error instanceof TypeError) return "Could not reach the server. Check your connection and try again.";
  return error?.message || fallback;
}

// A successful answer always carries { settings, fonts, categoryIds, categories }.
function readConfig(json) {
  if (!json?.data || typeof json.data !== "object") throw new Error("The server sent an unexpected response.");
  return json.data;
}

export default function EngravingSettingsForm() {
  const [form, setForm] = useState(() => toFormState(null));
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState(NO_ERRORS);
  // A message that stays on screen (a toast fades after a couple of seconds): { kind, message }.
  const [notice, setNotice] = useState(null);
  const [openKeys, setOpenKeys] = useState(() => new Set());
  const [focusTarget, setFocusTarget] = useState(null);
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });

  const toastTimerRef = useRef(null);
  const savingRef = useRef(false);
  const loadSeqRef = useRef(0);

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  // Focus requests are handled after the render that applied them, so a font row that was just
  // added or expanded already has its inputs in the page.
  useEffect(() => {
    if (focusTarget) focusControl(focusTarget.id, { center: focusTarget.center });
  }, [focusTarget]);

  function showToast(message, variant = "success") {
    setToast({ message, visible: true, variant });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
  }

  function dismissToast() {
    clearTimeout(toastTimerRef.current);
    setToast((t) => ({ ...t, visible: false }));
  }

  function applyConfig(data) {
    setForm(toFormState(data));
    setCategories(toCategoryList(data));
    setErrors(NO_ERRORS);
    setOpenKeys(new Set());
  }

  async function loadSettings() {
    const seq = ++loadSeqRef.current;
    setLoading(true);
    try {
      const res = await fetch(API_URL);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || "Failed to load engraving settings");
      const data = readConfig(json);
      if (seq !== loadSeqRef.current) return;
      applyConfig(data);
      setLoaded(true);
      setNotice(null);
    } catch (error) {
      if (seq !== loadSeqRef.current) return;
      // The form is left exactly as it was: a failed (re)load must not wipe what is on screen.
      const message = errorMessage(error, "Failed to load engraving settings");
      showToast(message, "error");
      if (!loaded) setNotice({ kind: "load", message });
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- General settings ---

  function setSetting(field, value) {
    setForm((prev) => ({ ...prev, settings: { ...prev.settings, [field]: value } }));
    const key = settingErrorKey(field);
    setErrors((prev) => (prev.settings[key] ? { ...prev, settings: { ...prev.settings, [key]: undefined } } : prev));
  }

  // --- Categories ---

  function setCategoryIds(categoryIds) {
    setForm((prev) => ({ ...prev, categoryIds }));
  }

  // --- Fonts ---

  function changeFont(key, field, value) {
    setForm((prev) => ({
      ...prev,
      fonts: prev.fonts.map((font) => (font.key === key ? { ...font, [field]: value } : font)),
    }));
    setErrors((prev) =>
      prev.fonts[key]?.[field]
        ? { ...prev, fonts: { ...prev.fonts, [key]: { ...prev.fonts[key], [field]: undefined } } }
        : prev
    );
  }

  function toggleFontOpen(key) {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function addFont() {
    const font = blankFont();
    setForm((prev) => ({ ...prev, fonts: [...prev.fonts, font] }));
    setOpenKeys((prev) => new Set(prev).add(font.key));
    setFocusTarget({ id: fontFieldId(font.key, "name"), center: true });
  }

  function moveFont(key, delta) {
    const index = form.fonts.findIndex((font) => font.key === key);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= form.fonts.length) return;
    setForm((prev) => ({ ...prev, fonts: moveItem(prev.fonts, prev.fonts.findIndex((font) => font.key === key), delta) }));
    // The row keeps the button that was used under the keyboard focus, unless the row has just
    // reached an end of the list, where that button is now disabled.
    const reachedEnd = delta < 0 ? target === 0 : target === form.fonts.length - 1;
    const direction = (delta < 0) !== reachedEnd ? "up" : "down";
    setFocusTarget({ id: fontFieldId(key, direction), center: false });
  }

  function deleteFont(key) {
    const index = form.fonts.findIndex((font) => font.key === key);
    const remaining = form.fonts.filter((font) => font.key !== key);
    setForm((prev) => ({ ...prev, fonts: prev.fonts.filter((font) => font.key !== key) }));
    setOpenKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setErrors((prev) => {
      if (!prev.fonts[key]) return prev;
      const rest = { ...prev.fonts };
      delete rest[key];
      return { ...prev, fonts: rest };
    });
    // The Delete button that had focus is gone: move focus to the next row, or to Add font.
    const neighbour = remaining[Math.min(index, remaining.length - 1)];
    setFocusTarget({ id: neighbour ? fontFieldId(neighbour.key, "edit") : ADD_FONT_ID, center: false });
  }

  // --- Save / discard ---

  async function handleSave() {
    if (savingRef.current || loading || !loaded) return;

    const result = validateEngravingForm(form);
    setErrors({ settings: result.settingsErrors, fonts: result.fontErrors });

    if (!result.valid) {
      showToast(result.message, "error");
      // Every font row with a problem is opened so its message is visible, not just the first.
      const withErrors = Object.keys(result.fontErrors);
      if (withErrors.length > 0) setOpenKeys((prev) => new Set([...prev, ...withErrors]));
      setFocusTarget({ id: result.firstId, center: true });
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch(API_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSavePayload(form, categories)),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        const failure = new Error(json?.error || `Failed to save engraving settings (${res.status})`);
        failure.field = json?.field;
        throw failure;
      }
      applyConfig(readConfig(json));
      showToast("Engraving settings saved");
    } catch (error) {
      // Nothing on screen is changed: the admin keeps their edits and can fix and retry.
      const message = errorMessage(error, "Failed to save engraving settings");
      showToast(message, "error");
      setNotice({ kind: "save", message });
      const mapped = applyServerFieldError(error.field, message, form);
      if (mapped) {
        setErrors({ settings: mapped.settingsErrors, fonts: mapped.fontErrors });
        if (mapped.fontKey) setOpenKeys((prev) => new Set(prev).add(mapped.fontKey));
        setFocusTarget({ id: mapped.id, center: true });
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function handleDiscard() {
    if (savingRef.current) return;
    if (!window.confirm("Discard all changes and reload your saved settings?")) return;
    loadSettings();
  }

  // "error" is a first load that failed: the sections stay locked so the defaults on screen cannot
  // be mistaken for (or saved over) what is stored.
  const status = loaded ? "ready" : loading ? "loading" : "error";
  const locked = loading || !loaded;

  return (
    <>
      <PageToolbar
        icon="edit-2"
        title="Engraving"
        onDiscard={handleDiscard}
        onSave={handleSave}
        saving={saving}
        disabled={locked}
      />

      {notice && (
        <div
          role="alert"
          className="flex flex-wrap items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{notice.kind === "load" ? "Engraving settings could not be loaded" : "Changes were not saved"}</p>
            <p className="mt-0.5 break-words">{notice.message}</p>
            {notice.kind === "load" && (
              <p className="mt-0.5 text-xs opacity-80">Saving is turned off until the settings load, so nothing stored is overwritten.</p>
            )}
          </div>
          {notice.kind === "load" ? (
            <button
              type="button"
              onClick={loadSettings}
              disabled={loading}
              className="shrink-0 px-4 h-9 rounded-xl border border-red-300 dark:border-red-400/40 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? "Loading..." : "Try again"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="shrink-0 px-4 h-9 rounded-xl border border-red-300 dark:border-red-400/40 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-500/10 transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <GeneralSection settings={form.settings} errors={errors.settings} onChange={setSetting} disabled={locked} />

          <CategoriesSection
            categories={categories}
            selectedIds={form.categoryIds}
            onChange={setCategoryIds}
            disabled={locked}
            status={status}
          />

          <FontsSection
            fonts={form.fonts}
            errors={errors.fonts}
            openKeys={openKeys}
            engravingEnabled={form.settings.enabled}
            disabled={locked}
            status={status}
            onChange={changeFont}
            onToggleOpen={toggleFontOpen}
            onAdd={addFont}
            onMove={moveFont}
            onDelete={deleteFont}
          />
        </div>

        <div className="space-y-6">
          <InfoSidebar
            title="About Engraving"
            points={[
              "The Enable engraving switch hides engraving everywhere at once, without changing any product or category.",
              "Pick categories to offer engraving on all their products and sub-categories. A single product can still turn it on or off in its own Engraving setting.",
              "Customers can only type the characters allowed here, and the same rules are checked again when they check out.",
              "Fonts appear in the order listed. Past orders keep their own copy of the font name, so edits never change an order already placed.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </>
  );
}
