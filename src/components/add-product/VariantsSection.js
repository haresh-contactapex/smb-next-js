"use client";

import { useRef, useState } from "react";
import Icon from "@/components/admin-panel/Icon";
import { WEIGHT_UNITS } from "@/data/addProductData";
import { slugify, sanitizeDecimal, sanitizeInteger, isMissingUpload } from "./helpers";

function OptionRow({ option, onNameChange, onRemove, onAddValue, onRemoveValue, onReorderValues }) {
  const [valueInput, setValueInput] = useState("");
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const draggedRef = useRef(null);

  function handleValueKeyDown(e) {
    if ((e.key === "Enter" || e.key === ",") && valueInput.trim()) {
      e.preventDefault();
      const val = valueInput.trim().replace(/,$/, "");
      if (val && !option.values.includes(val)) onAddValue(val);
      setValueInput("");
    }
  }

  function handleDragStart(vi) {
    draggedRef.current = vi;
    setDragIndex(vi);
  }

  function handleDragOver(e, vi) {
    e.preventDefault();
    if (vi !== dropIndex) setDropIndex(vi);
  }

  function handleDrop(vi) {
    const from = draggedRef.current;
    if (from !== null && from !== vi) onReorderValues(from, vi);
    draggedRef.current = null;
    setDragIndex(null);
    setDropIndex(null);
  }

  function handleDragEnd() {
    draggedRef.current = null;
    setDragIndex(null);
    setDropIndex(null);
  }

  return (
    <div className="border border-slate-200 dark:border-white/10 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          value={option.name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Option name (e.g. Color)"
          aria-label="Option name"
          className="flex-1 h-9 px-2.5 rounded-lg bg-slate-100 dark:bg-darksurface2 border border-transparent focus:border-primary-400 dark:focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-primary-500/10 text-sm font-medium text-slate-800 dark:text-white"
        />
        <button type="button" onClick={onRemove} className="text-slate-400 hover:text-error text-xs font-semibold px-1">
          Remove
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 rounded-lg bg-slate-100 dark:bg-darksurface2 border border-transparent focus-within:border-primary-400 dark:focus-within:border-accent-500 px-2 py-1.5 min-h-[38px] transition-all">
        {option.values.map((val, vi) => (
          <span
            key={val}
            draggable
            onDragStart={() => handleDragStart(vi)}
            onDragOver={(e) => handleDragOver(e, vi)}
            onDrop={() => handleDrop(vi)}
            onDragEnd={handleDragEnd}
            title="Drag to reorder"
            className={`chip cursor-grab active:cursor-grabbing transition-opacity${
              dragIndex === vi ? " opacity-40" : ""
            }${dropIndex === vi && dragIndex !== vi ? " ring-2 ring-primary-400 dark:ring-accent-500" : ""}`}
          >
            <span>{val}</span>
            <button type="button" onClick={() => onRemoveValue(vi)}>
              &times;
            </button>
          </span>
        ))}
        <input
          type="text"
          value={valueInput}
          onChange={(e) => setValueInput(e.target.value)}
          onKeyDown={handleValueKeyDown}
          placeholder="Add value, press Enter"
          aria-label="Add option value"
          className="flex-1 min-w-[90px] bg-transparent border-none focus:outline-none focus:ring-0 px-1 py-0.5 text-sm text-slate-800 dark:text-white placeholder:text-slate-400"
        />
      </div>
      <p className="text-[11px] text-slate-400 mt-1.5">Drag a value to reorder — variants below follow this order.</p>
    </div>
  );
}

function VariantImageCell({ image, label, onChange, onRemove }) {
  const inputRef = useRef(null);
  const missing = isMissingUpload(image);

  function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (file) onChange(file);
    e.target.value = "";
  }

  return (
    <div className="relative group w-9 h-9 shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        title={missing ? "Image missing — upload it again" : image ? "Change variant image" : "Add variant image"}
        aria-label={missing ? `${label} image missing, upload again` : `${label} image`}
        className={`w-9 h-9 rounded-lg border border-dashed ${missing ? "border-red-400 bg-red-50 dark:bg-red-500/10" : "border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-darksurface2/60"} overflow-hidden grid place-items-center hover:border-primary-400 dark:hover:border-accent-500/60 transition-colors`}
      >
        {missing ? (
          <Icon name="upload-cloud" className="w-4 h-4 text-error" />
        ) : image ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob: preview or Vercel Blob URL
          <img
            src={image.url}
            alt={image.name || label}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.opacity = 0.15;
            }}
          />
        ) : (
          <Icon name="upload-cloud" className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {image && (
        <button
          type="button"
          aria-label={`Remove ${label} image`}
          onClick={onRemove}
          className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-900/80 text-white text-[10px] leading-none group-hover:opacity-100 focus:opacity-100 transition flex items-center justify-center${missing ? " opacity-100" : " opacity-0"}`}
        >
          &times;
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        aria-hidden="true"
        onChange={handleFileSelected}
      />
    </div>
  );
}

export default function VariantsSection({
  options,
  variants,
  variantErrors,
  sectionRef,
  onOptionsChange,
  onVariantsChange,
  onVariantImageChange,
  onVariantImageRemove,
}) {
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkQty, setBulkQty] = useState("");

  function addOption() {
    onOptionsChange([
      ...options,
      { id: "attr_option" + (options.length + 1), name: "", values: [] },
    ]);
  }

  function updateOptionName(index, name) {
    const next = options.slice();
    next[index] = { ...next[index], name, id: "attr_" + slugify(name || "option") };
    onOptionsChange(next);
  }

  function removeOption(index) {
    onOptionsChange(options.filter((_, i) => i !== index));
  }

  function addOptionValue(index, value) {
    const next = options.slice();
    next[index] = { ...next[index], values: [...next[index].values, value] };
    onOptionsChange(next);
  }

  function removeOptionValue(index, valueIndex) {
    const next = options.slice();
    next[index] = { ...next[index], values: next[index].values.filter((_, i) => i !== valueIndex) };
    onOptionsChange(next);
  }

  function reorderOptionValues(index, fromIndex, toIndex) {
    const next = options.slice();
    const values = next[index].values.slice();
    const [moved] = values.splice(fromIndex, 1);
    values.splice(toIndex, 0, moved);
    next[index] = { ...next[index], values };
    onOptionsChange(next);
  }

  function updateVariantField(index, field, value) {
    const next = variants.slice();
    next[index] = { ...next[index], [field]: value };
    onVariantsChange(next);
  }

  function applyBulk() {
    const price = bulkPrice.trim();
    const qty = bulkQty.trim();
    onVariantsChange(
      variants.map((v) => ({
        ...v,
        price: price || v.price,
        inventory_quantity: qty || v.inventory_quantity,
      }))
    );
  }

  const hasOptions = options.length > 0;
  const hasVariantErrors = variantErrors?.some((err) => err.price || err.quantity);

  return (
    <section
      ref={sectionRef}
      className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5"
    >
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Variants</h2>

      {!hasOptions && (
        <button
          type="button"
          onClick={addOption}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:border-primary-400 dark:hover:border-accent-500/50 hover:text-primary-600 dark:hover:text-accent-400 transition-colors"
        >
          <Icon name="plus-circle" className="w-4 h-4" /> Add options like size or color
        </button>
      )}

      {hasOptions && (
        <div>
          <div className="space-y-3 mb-2">
            {options.map((opt, oi) => (
              <OptionRow
                key={oi}
                option={opt}
                onNameChange={(name) => updateOptionName(oi, name)}
                onRemove={() => removeOption(oi)}
                onAddValue={(val) => addOptionValue(oi, val)}
                onRemoveValue={(vi) => removeOptionValue(oi, vi)}
                onReorderValues={(from, to) => reorderOptionValues(oi, from, to)}
              />
            ))}
          </div>
          <button type="button" onClick={addOption} className="text-xs font-semibold text-primary-600 dark:text-accent-400 hover:underline">
            + Add another option
          </button>

          <div className="border-t border-slate-100 dark:border-white/5 mt-5 pt-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Variants{" "}
                <span className="text-slate-400 font-normal">
                  {variants.length ? `(${variants.length})` : ""}
                </span>
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Apply to all:</span>
                <input
                  type="text"
                  value={bulkPrice}
                  onChange={(e) => setBulkPrice(sanitizeDecimal(e.target.value))}
                  placeholder="Price"
                  aria-label="Bulk price"
                  className="w-20 h-8 px-2 rounded-lg bg-slate-100 dark:bg-darksurface2 border border-transparent focus:border-primary-400 dark:focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-primary-500/10 system-field text-slate-800 dark:text-white"
                />
                <input
                  type="text"
                  value={bulkQty}
                  onChange={(e) => setBulkQty(sanitizeInteger(e.target.value))}
                  placeholder="Qty"
                  aria-label="Bulk quantity"
                  className="w-16 h-8 px-2 rounded-lg bg-slate-100 dark:bg-darksurface2 border border-transparent focus:border-primary-400 dark:focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-primary-500/10 system-field text-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={applyBulk}
                  className="px-2.5 h-8 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
            <div className="overflow-x-auto custom-scroll -mx-1">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-white/5">
                    <th className="py-2 px-1 font-semibold w-12">Image</th>
                    <th className="py-2 px-1 font-semibold">Variant</th>
                    <th className="py-2 px-1 font-semibold w-24">Price</th>
                    <th className="py-2 px-1 font-semibold w-28">Compare-at</th>
                    <th className="py-2 px-1 font-semibold w-28">SKU</th>
                    <th className="py-2 px-1 font-semibold w-20">Qty</th>
                    <th className="py-2 px-1 font-semibold w-16">Track</th>
                    <th className="py-2 px-1 font-semibold w-32">Weight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {variants.map((v, i) => {
                    const label = Object.values(v.options).join(" / ") || "Default";
                    const rowError = variantErrors?.[i];
                    const cellClass = (invalid) =>
                      `variant-input w-full h-8 px-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary-500/10 system-field text-slate-800 dark:text-white${
                        invalid
                          ? " border-red-400 bg-red-50 dark:bg-red-500/10 focus:border-red-400"
                          : " border-transparent bg-slate-100 dark:bg-darksurface2 focus:border-primary-400 dark:focus:border-accent-500"
                      }`;
                    return (
                      <tr key={v.id}>
                        <td className="py-2 px-1">
                          <VariantImageCell
                            image={v.image}
                            label={label}
                            onChange={(file) => onVariantImageChange(i, file)}
                            onRemove={() => onVariantImageRemove(i)}
                          />
                        </td>
                        <td className="py-2 px-1 font-medium text-slate-700 dark:text-slate-200">{label}</td>
                        <td className="py-2 px-1">
                          <input
                            type="text"
                            value={v.price}
                            onChange={(e) => updateVariantField(i, "price", sanitizeDecimal(e.target.value))}
                            placeholder="0.00"
                            aria-label={`${label} price`}
                            className={cellClass(rowError?.price)}
                          />
                        </td>
                        <td className="py-2 px-1">
                          <input
                            type="text"
                            value={v.compare_at_price}
                            onChange={(e) => updateVariantField(i, "compare_at_price", sanitizeDecimal(e.target.value))}
                            placeholder="—"
                            aria-label={`${label} compare-at price`}
                            className={cellClass(false)}
                          />
                        </td>
                        <td className="py-2 px-1">
                          <input
                            type="text"
                            value={v.sku}
                            onChange={(e) => updateVariantField(i, "sku", e.target.value)}
                            aria-label={`${label} SKU`}
                            className={cellClass(false)}
                          />
                        </td>
                        <td className="py-2 px-1">
                          <input
                            type="text"
                            value={v.inventory_quantity}
                            onChange={(e) => updateVariantField(i, "inventory_quantity", sanitizeInteger(e.target.value))}
                            aria-label={`${label} quantity`}
                            className={cellClass(rowError?.quantity)}
                          />
                        </td>
                        <td className="py-2 px-1 text-center">
                          <input
                            type="checkbox"
                            checked={v.inventory_management}
                            onChange={(e) => updateVariantField(i, "inventory_management", e.target.checked)}
                            className="w-4 h-4 accent-primary-500 dark:accent-accent-500"
                          />
                        </td>
                        <td className="py-2 px-1">
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={v.weight}
                              onChange={(e) => updateVariantField(i, "weight", sanitizeDecimal(e.target.value))}
                              placeholder="0.0"
                              className="variant-input w-16 h-8 px-2 rounded-lg bg-slate-100 dark:bg-darksurface2 border border-transparent focus:border-primary-400 dark:focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-primary-500/10 system-field text-slate-800 dark:text-white"
                            />
                            <select
                              value={v.weight_unit}
                              onChange={(e) => updateVariantField(i, "weight_unit", e.target.value)}
                              className="h-8 px-1.5 rounded-lg bg-slate-100 dark:bg-darksurface2 border border-transparent focus:border-primary-400 dark:focus:border-accent-500 focus:outline-none text-xs system-field text-slate-700 dark:text-slate-200"
                            >
                              {WEIGHT_UNITS.map((unit) => (
                                <option key={unit} value={unit}>
                                  {unit}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {hasVariantErrors && (
              <p className="text-xs text-error mt-2">Add a price and quantity for every variant.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
