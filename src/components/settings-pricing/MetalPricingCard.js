"use client";

import { useEffect, useState } from "react";
import SectionCard from "@/components/settings-shared/SectionCard";
import Icon from "@/components/admin-panel/Icon";
import ApplyScopePicker from "./ApplyScopePicker";
import {
  ADJUSTMENT_DIRECTIONS,
  ADJUSTMENT_TYPES,
  DEFAULT_METAL_RULES,
  PRICING_METALS,
  calculateAdjustedPrice,
  toMetalRulesPayload,
  validateApplyScope,
  validateMetalRulesForm,
} from "./helpers";

const COMPACT_SELECT =
  "field-input appearance-none cursor-pointer !h-9 !py-0 text-xs disabled:opacity-50 disabled:cursor-not-allowed";
const ERROR_INPUT = " !border-red-400 focus:!border-red-400 !bg-red-50 focus:!bg-red-50 dark:!bg-red-500/10 dark:focus:!bg-red-500/10";

function adjustWith(row, price) {
  return calculateAdjustedPrice(price, row.adjustmentValue, row.adjustmentType, row.adjustmentDirection);
}

// A separate bulk price change with one adjustment per metal (14K, 18K, Platinum), applied together.
// The plain adjustment above it is untouched; this one only moves variants of the ticked metals, and
// each product's own price follows the metal of its default variant (see applyMetalPriceAdjustment
// in src/lib/pricing.js).
export default function MetalPricingCard({ disabled = false, backedUp, formatMoney, currencySymbol, showToast }) {
  const [rows, setRows] = useState(DEFAULT_METAL_RULES);
  const [errors, setErrors] = useState({});
  const [scope, setScope] = useState("all");
  const [categoryIds, setCategoryIds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [applying, setApplying] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const scopeReady = validateApplyScope(scope, categoryIds).valid;

  // Counts and the sample product depend only on who is in scope, not on the typed values.
  useEffect(() => {
    if (!scopeReady) {
      setPreview(null);
      setPreviewError("");
      return undefined;
    }
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError("");
    fetch("/api/settings/pricing/metals-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, categoryIds: scope === "categories" ? categoryIds : [] }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Failed to load the price preview");
        if (!cancelled) setPreview(json.data);
      })
      .catch((error) => {
        if (!cancelled) {
          setPreview(null);
          setPreviewError(error.message);
        }
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scope, categoryIds, scopeReady, refreshKey]);

  function setRow(metal, field, value) {
    setRows((prev) => prev.map((row) => (row.metal === metal ? { ...row, [field]: value } : row)));
    setErrors((prev) => (prev[metal] ? { ...prev, [metal]: undefined } : prev));
  }

  const activeRows = rows.filter((row) => row.enabled);
  const rowByMetal = Object.fromEntries(rows.map((row) => [row.metal, row]));
  const skippedCount = preview ? activeRows.reduce((total, row) => total + (preview.metals[row.metal]?.skippedCount ?? 0), 0) : 0;

  async function handleApply() {
    const result = validateMetalRulesForm(rows);
    setErrors(result.errors);
    if (!result.valid) {
      showToast(result.message, "error");
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
        ? `products in ${selectedCategories.length} selected categor${selectedCategories.length === 1 ? "y" : "ies"} (${selectedCategories
            .map((category) => category.name)
            .join(", ")})`
        : "all products";
    const ruleLines = activeRows.map((row) => {
      const metal = PRICING_METALS.find((candidate) => candidate.value === row.metal);
      const amount = row.adjustmentType === "fixed" ? formatMoney(Number(row.adjustmentValue)) : `${row.adjustmentValue}%`;
      return `  • ${metal.label}: ${row.adjustmentDirection === "decrease" ? "decrease" : "increase"} by ${amount}`;
    });
    const backupReminder = backedUp
      ? ""
      : " You haven't downloaded a CSV backup yet this session — recommended before an irreversible bulk change.";
    if (
      !window.confirm(
        `Apply ${activeRows.length} metal rule${activeRows.length === 1 ? "" : "s"} to ${scopeWord}?\n\n${ruleLines.join(
          "\n"
        )}\n\nThis changes the price and compare-at price of every matching variant, and each product's own price follows its default variant. This cannot be undone.${backupReminder}`
      )
    ) {
      return;
    }

    setApplying(true);
    try {
      const res = await fetch("/api/settings/pricing/apply-metals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metalRules: toMetalRulesPayload(rows),
          scope,
          categoryIds: scope === "categories" ? categoryIds : [],
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to apply the metal price adjustments");
      const { updatedProductCount, updatedVariantCount, skippedVariantCount } = json.data;
      showToast(
        `Updated ${updatedProductCount} product(s) and ${updatedVariantCount} variant(s)` +
          (skippedVariantCount ? ` — ${skippedVariantCount} without their own price skipped` : "")
      );
      setRefreshKey((key) => key + 1);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setApplying(false);
    }
  }

  const sample = preview?.sample;
  const baseRule = sample?.baseMetal ? rowByMetal[sample.baseMetal] : null;

  function renderPriceChange(current, row) {
    if (current == null) return <span className="text-slate-400">—</span>;
    if (!row?.enabled) return <span className="text-slate-400">{formatMoney(current)} · unchanged</span>;
    return (
      <>
        <span className="text-slate-500 dark:text-slate-400">{formatMoney(current)}</span>
        <span className="mx-1 text-slate-400">to</span>
        <span className="font-semibold text-slate-800 dark:text-white">{formatMoney(adjustWith(row, current))}</span>
      </>
    );
  }

  return (
    <SectionCard
      title="Price Adjustment by Metal"
      description="Set a different adjustment for each metal and apply them together in one run. This is separate from the adjustment above."
    >
      <div className="hidden sm:grid grid-cols-[1.25rem_minmax(0,1fr)_7rem_8rem_6rem] gap-2 text-[11px] text-slate-400 px-0.5">
        <span />
        <span>Metal</span>
        <span>Direction</span>
        <span>Type</span>
        <span>Value</span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-white/5 border-t border-slate-100 dark:border-white/5 -mt-2">
        {PRICING_METALS.map((metal) => {
          const row = rowByMetal[metal.value];
          const counts = preview?.metals[metal.value];
          return (
            <div
              key={metal.value}
              className={`grid grid-cols-2 sm:grid-cols-[1.25rem_minmax(0,1fr)_7rem_8rem_6rem] gap-2 items-center py-3 ${row.enabled ? "" : "opacity-50"}`}
            >
              <input
                type="checkbox"
                checked={row.enabled}
                onChange={(e) => setRow(metal.value, "enabled", e.target.checked)}
                disabled={disabled || applying}
                aria-label={`Include ${metal.label}`}
                className="h-4 w-4 rounded border-slate-300 dark:border-white/20 text-primary-500 dark:text-accent-500 focus:ring-primary-400 dark:focus:ring-accent-500"
              />
              <div className="min-w-0 sm:order-none">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex gap-0.5" aria-hidden="true">
                    {metal.swatches.map((color) => (
                      <i key={color} className="block w-2.5 h-2.5 rounded-full border border-black/10" style={{ background: color }} />
                    ))}
                  </span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-white">{metal.label}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {metal.description}
                  {counts ? ` · ${counts.variantCount} variant${counts.variantCount === 1 ? "" : "s"}` : ""}
                </p>
              </div>
              <select
                value={row.adjustmentDirection}
                onChange={(e) => setRow(metal.value, "adjustmentDirection", e.target.value)}
                disabled={disabled || applying || !row.enabled}
                aria-label={`${metal.label} adjustment direction`}
                className={COMPACT_SELECT}
              >
                {ADJUSTMENT_DIRECTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={row.adjustmentType}
                onChange={(e) => setRow(metal.value, "adjustmentType", e.target.value)}
                disabled={disabled || applying || !row.enabled}
                aria-label={`${metal.label} adjustment type`}
                className={COMPACT_SELECT}
              >
                {ADJUSTMENT_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.value === "fixed" ? `Fixed (${currencySymbol})` : "Percentage (%)"}
                  </option>
                ))}
              </select>
              <div className="col-span-2 sm:col-span-1">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.adjustmentValue}
                  onChange={(e) => setRow(metal.value, "adjustmentValue", e.target.value)}
                  disabled={disabled || applying || !row.enabled}
                  aria-label={`${metal.label} adjustment value`}
                  className={`field-input !h-9 !py-0 text-xs${errors[metal.value] ? ERROR_INPUT : ""} disabled:opacity-50 disabled:cursor-not-allowed`}
                />
                {errors[metal.value] && <p className="text-[11px] text-error mt-1">{errors[metal.value]}</p>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Untick a metal to leave its prices alone. Each rule changes the price and compare-at price of its variants, and each
        product&apos;s own price follows the metal of its default variant.
      </p>

      <div className="pt-2 border-t border-slate-100 dark:border-white/5">
        <ApplyScopePicker
          scope={scope}
          onScopeChange={setScope}
          categoryIds={categoryIds}
          onCategoryIdsChange={setCategoryIds}
          onCategoriesLoaded={setCategories}
          disabled={disabled || applying}
        />
      </div>

      <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2">
        <h3 className="text-xs font-bold text-slate-800 dark:text-white">Preview on a sample product</h3>
        {previewError ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
            <span>{previewError}</span>
            <button type="button" onClick={() => setRefreshKey((key) => key + 1)} className="font-semibold underline shrink-0">
              Retry
            </button>
          </div>
        ) : !scopeReady ? (
          <p className="text-xs text-slate-400">Select at least one category to see a preview.</p>
        ) : previewLoading && !preview ? (
          <p className="text-xs text-slate-400">Loading preview…</p>
        ) : sample ? (
          <div className="overflow-x-auto">
            <p className="text-[11px] text-slate-400 mb-1">{sample.title}</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[11px] text-slate-400">
                  <th className="font-normal py-1">Item</th>
                  <th className="font-normal py-1 text-right">Price</th>
                  <th className="font-normal py-1 text-right">Compare-at</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-200">
                {sample.variants.map((variant) => {
                  const metal = PRICING_METALS.find((candidate) => candidate.value === variant.metal);
                  const row = rowByMetal[variant.metal];
                  return (
                    <tr key={variant.metal}>
                      <td className="py-1.5">{metal.label} variant</td>
                      <td className="py-1.5 text-right">
                        {renderPriceChange(variant.price, row)}
                      </td>
                      <td className="py-1.5 text-right">
                        {renderPriceChange(variant.compareAt, row)}
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td className="py-1.5">
                    Product price
                    <span className="block text-[11px] text-slate-400">
                      Follows the default variant ({PRICING_METALS.find((metal) => metal.value === sample.baseMetal)?.label ?? "no metal"})
                    </span>
                  </td>
                  <td className="py-1.5 text-right">
                    {renderPriceChange(sample.basePrice, baseRule)}
                  </td>
                  <td className="py-1.5 text-right">
                    {renderPriceChange(sample.baseCompareAt, baseRule)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400">No products with 14K, 18K or Platinum variants in this selection.</p>
        )}

        {skippedCount > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            <Icon name="alert-triangle" className="w-4 h-4 shrink-0 mt-px" />
            <span>
              {skippedCount} variant{skippedCount === 1 ? " has" : "s have"} no price of {skippedCount === 1 ? "its" : "their"} own and use{" "}
              {skippedCount === 1 ? "its" : "their"} product&apos;s price, so {skippedCount === 1 ? "it" : "they"}&apos;ll be skipped. Set a price on{" "}
              {skippedCount === 1 ? "it" : "them"} first if each metal should cost differently.
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {activeRows.length} of {PRICING_METALS.length} metals selected
        </span>
        <button
          type="button"
          onClick={handleApply}
          disabled={disabled || applying || activeRows.length === 0}
          className="px-4 h-9 rounded-xl bg-primary-500 dark:bg-accent-500 hover:bg-primary-600 dark:hover:bg-accent-600 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          {applying ? "Applying…" : `Apply ${activeRows.length} Metal Rule${activeRows.length === 1 ? "" : "s"}`}
        </button>
      </div>
    </SectionCard>
  );
}
