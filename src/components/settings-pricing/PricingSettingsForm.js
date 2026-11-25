"use client";

import { useEffect, useRef, useState } from "react";
import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";
import { getCurrencySymbol } from "@/lib/currency";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import SelectField from "@/components/settings-shared/SelectField";
import TextField from "@/components/settings-shared/TextField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Icon from "@/components/admin-panel/Icon";
import Toast from "./Toast";
import { useCan } from "@/components/providers/StaffPermissionsProvider";
import { settingsPermission } from "@/lib/permissions";
import {
  ADJUSTMENT_TYPES,
  ADJUSTMENT_DIRECTIONS,
  DEFAULT_PRICING_SETTINGS,
  PRICING_SCOPES,
  toFormSettings,
  toSavePayload,
  validateApplyScope,
  validatePricingSettingsForm,
} from "./helpers";

function downloadCsv(filename, csvText) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function PricingSettingsForm() {
  const { currency, formatMoney } = useGeneralSettings();
  // Bulk repricing rewrites every product, so it needs both permissions
  // (mirrors /api/settings/pricing/apply).
  const can = useCan();
  const canApply = can(settingsPermission("pricing", "edit")) && can("products.edit");
  const canBackup = can("products.export");
  const [settings, setSettings] = useState(DEFAULT_PRICING_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [backedUp, setBackedUp] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });

  // Who "Apply to All Products" rewrites — not part of the saved settings,
  // just chosen right before applying (see validateApplyScope).
  const [scope, setScope] = useState("all");
  const [categoryIds, setCategoryIds] = useState([]);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState("");
  const categoriesLoadedRef = useRef(false);

  const toastTimerRef = useRef(null);
  const adjustmentValueInputRef = useRef(null);

  const fieldRefs = {
    adjustmentValue: adjustmentValueInputRef,
  };

  function focusField(field) {
    fieldRefs[field]?.current?.focus();
  }

  function showToast(message, variant = "success") {
    setToast({ message, visible: true, variant });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
  }

  function dismissToast() {
    clearTimeout(toastTimerRef.current);
    setToast((t) => ({ ...t, visible: false }));
  }

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/pricing");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load pricing settings");
      setSettings(toFormSettings(json.data));
      setErrors({});
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadCategories() {
    setCategoriesLoading(true);
    setCategoriesError("");
    try {
      const res = await fetch("/api/categories");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load categories");
      setCategories(Array.isArray(json.data) ? json.data : []);
      categoriesLoadedRef.current = true;
    } catch (error) {
      setCategoriesError(error.message);
    } finally {
      setCategoriesLoading(false);
    }
  }

  // Categories are only needed once the admin chooses to scope by category —
  // loaded the first time, not on every page visit.
  function handleScopeChange(value) {
    setScope(value);
    if (value === "categories" && !categoriesLoadedRef.current && !categoriesLoading) {
      loadCategories();
    }
  }

  function toggleCategory(id) {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((existing) => existing !== id) : [...prev, id]));
  }

  function setField(field, value) {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  async function handleSave() {
    const result = validatePricingSettingsForm(settings);
    setErrors(result.errors);

    if (!result.valid) {
      showToast(result.message, "error");
      focusField(result.firstErrorField);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSavePayload(settings)),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save pricing settings");
      setSettings(toFormSettings(json.data));
      showToast("Pricing settings saved");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and reload your saved settings?")) return;
    loadSettings();
  }

  async function handleBackup() {
    setBackingUp(true);
    try {
      const res = await fetch("/api/products/export");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to back up products");
      downloadCsv(json.data.filename, json.data.csv);
      setBackedUp(true);
      const count = json.data.productCount;
      showToast(`Backup complete — saved ${count} product${count === 1 ? "" : "s"} to ${json.data.filename}`);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setBackingUp(false);
    }
  }

  async function handleApply() {
    const result = validatePricingSettingsForm(settings);
    setErrors(result.errors);

    if (!result.valid) {
      showToast(result.message, "error");
      focusField(result.firstErrorField);
      return;
    }

    const scopeResult = validateApplyScope(scope, categoryIds);
    if (!scopeResult.valid) {
      showToast(scopeResult.message, "error");
      return;
    }

    const selectedCategories = categories.filter((category) => categoryIds.includes(category.id));
    const scopeWord =
      scope === "categories"
        ? `every product in ${selectedCategories.length} selected categor${selectedCategories.length === 1 ? "y" : "ies"} (${selectedCategories
            .map((category) => category.name)
            .join(", ")})`
        : "every product";

    const directionWord = settings.adjustmentDirection === "decrease" ? "decrease" : "increase";
    const amountWord =
      settings.adjustmentType === "fixed" ? formatMoney(Number(settings.adjustmentValue)) : `${settings.adjustmentValue}%`;
    const backupReminder = backedUp ? "" : " You haven't downloaded a CSV backup yet this session — recommended before an irreversible bulk change.";
    if (
      !window.confirm(
        `This will ${directionWord} the price and compare-at price of ${scopeWord}, and the price of its variants, by ${amountWord}. This cannot be undone.${backupReminder} Continue?`
      )
    ) {
      return;
    }

    setApplying(true);
    try {
      const res = await fetch("/api/settings/pricing/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...toSavePayload(settings),
          scope,
          categoryIds: scope === "categories" ? categoryIds : [],
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to apply the price adjustment");
      showToast(
        `Updated ${json.data.updatedProductCount} product(s) and ${json.data.updatedVariantCount} variant(s)`
      );
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setApplying(false);
    }
  }

  const categoryQueryLower = categoryQuery.trim().toLowerCase();
  const filteredCategories = categories
    .filter(
      (category) =>
        !categoryQueryLower ||
        category.name.toLowerCase().includes(categoryQueryLower) ||
        (category.parentPath || "").toLowerCase().includes(categoryQueryLower)
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <PageToolbar
        icon="percent"
        title="Pricing"
        onDiscard={handleDiscard}
        onSave={handleSave}
        saving={saving}
        disabled={loading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          {canBackup && (
            <SectionCard title="Backup Products">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Download every product and variant as a CSV file before applying a bulk price change, so you have a
                restore point if something needs to be undone.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleBackup}
                  disabled={backingUp}
                  className="inline-flex items-center gap-2 px-4 h-9 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Icon name="download" className="w-4 h-4" />
                  {backingUp ? "Backing up products…" : "Download CSV Backup"}
                </button>
                {backedUp && !backingUp && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                    <Icon name="check-circle" className="w-4 h-4" />
                    Backed up this session
                  </span>
                )}
              </div>
            </SectionCard>
          )}

          <SectionCard title="Price Adjustment">
            <TextField
              id="f-adjustment-value"
              label={`Adjustment Value (${settings.adjustmentType === "fixed" ? getCurrencySymbol(currency) : "%"})`}
              type="number"
              value={settings.adjustmentValue}
              onChange={(value) => setField("adjustmentValue", value)}
              placeholder="0"
              error={errors.adjustmentValue}
              inputRef={adjustmentValueInputRef}
              onEnter={handleSave}
              disabled={loading}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField
                id="f-adjustment-type"
                label="Adjustment Type"
                value={settings.adjustmentType}
                options={ADJUSTMENT_TYPES}
                onChange={(value) => setField("adjustmentType", value)}
              />
              <SelectField
                id="f-adjustment-direction"
                label="Adjustment Direction"
                value={settings.adjustmentDirection}
                options={ADJUSTMENT_DIRECTIONS}
                onChange={(value) => setField("adjustmentDirection", value)}
              />
            </div>

            {canApply && (
              <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-3">
                <div>
                  <label className="field-label">Apply To</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PRICING_SCOPES.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleScopeChange(option.value)}
                        disabled={loading}
                        className={`h-9 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-50 disabled:pointer-events-none ${
                          scope === option.value
                            ? "bg-primary-500 dark:bg-accent-500 text-white border-transparent"
                            : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {scope === "categories" && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={categoryQuery}
                      onChange={(e) => setCategoryQuery(e.target.value)}
                      placeholder="Search categories"
                      className="field-input"
                      disabled={categoriesLoading}
                    />

                    {categoriesError ? (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                        <span>{categoriesError}</span>
                        <button type="button" onClick={loadCategories} className="font-semibold underline shrink-0">
                          Retry
                        </button>
                      </div>
                    ) : (
                      <div className="max-h-56 overflow-y-auto custom-scroll border border-slate-200 dark:border-white/10 rounded-xl divide-y divide-slate-100 dark:divide-white/5">
                        {categoriesLoading ? (
                          <p className="px-3 py-3 text-xs text-slate-400">Loading categories…</p>
                        ) : filteredCategories.length > 0 ? (
                          filteredCategories.map((category) => (
                            <label
                              key={category.id}
                              className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5"
                            >
                              <input
                                type="checkbox"
                                checked={categoryIds.includes(category.id)}
                                onChange={() => toggleCategory(category.id)}
                                className="h-4 w-4 rounded border-slate-300 dark:border-white/20 text-primary-500 dark:text-accent-500 focus:ring-primary-400 dark:focus:ring-accent-500"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm text-slate-700 dark:text-slate-200 truncate">
                                  {category.name}
                                </span>
                                {category.parentPath && (
                                  <span className="block text-[11px] text-slate-400 truncate">{category.parentPath}</span>
                                )}
                              </span>
                              <span className="text-xs text-slate-400 shrink-0">{category.productCount} products</span>
                            </label>
                          ))
                        ) : (
                          <p className="px-3 py-3 text-xs text-slate-400">
                            {categories.length === 0 ? "There are no categories yet." : `No categories match "${categoryQuery.trim()}".`}
                          </p>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {categoryIds.length} {categoryIds.length === 1 ? "category" : "categories"} selected
                    </p>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={loading || applying}
                    className="px-4 h-9 rounded-xl bg-primary-500 dark:bg-accent-500 hover:bg-primary-600 dark:hover:bg-accent-600 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {applying ? "Applying…" : scope === "categories" ? "Apply to Selected Categories" : "Apply to All Products"}
                  </button>
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="percent"
            title="About Pricing Settings"
            points={[
              "Download a CSV backup of all products first — it's your restore point if a bulk adjustment needs to be undone.",
              "Choose whether the adjustment applies as a percentage of the price or a fixed amount.",
              "Increase raises product prices; decrease lowers them.",
              "Choose \"All Products\" to reprice the whole catalog, or \"Specific Categories\" to pick one or more categories — a product counts if it's listed under any of them.",
              "Applying immediately recalculates and overwrites the price and compare-at price of every matching product, plus the price of every variant that has its own — it cannot be undone.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </>
  );
}
