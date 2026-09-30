"use client";

import { MAX_CONTENT_LENGTH, MAX_TITLE_LENGTH } from "@/lib/reviewFields";
import ProductSearchField from "./ProductSearchField";
import RatingInput from "./RatingInput";

export default function ReviewDetailsSection({
  productId,
  productTitle,
  rating,
  title,
  content,
  errors,
  registerRef,
  onFieldChange,
  onProductSelect,
  onProductClear,
}) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Review</h2>

      <div className="space-y-4">
        <div>
          <label className="field-label" htmlFor="f-product">
            Product
          </label>
          <ProductSearchField
            selectedId={productId}
            selectedTitle={productTitle}
            error={errors.productId}
            inputRef={registerRef("productId")}
            onSelect={onProductSelect}
            onClear={onProductClear}
          />
          {errors.productId ? (
            <p id="f-product-error" className="text-xs text-error mt-1">
              {errors.productId}
            </p>
          ) : (
            <p id="f-product-help" className="text-[11px] text-slate-400 mt-1.5">
              Start typing a product name or SKU, then pick it from the suggestions.
            </p>
          )}
        </div>

        <RatingInput
          value={rating}
          error={errors.rating}
          inputRef={registerRef("rating")}
          onChange={(value) => onFieldChange("rating", value)}
        />

        <div>
          <label className="field-label" htmlFor="f-title">
            Review title
          </label>
          <input
            id="f-title"
            ref={registerRef("title")}
            type="text"
            value={title}
            maxLength={MAX_TITLE_LENGTH}
            onChange={(e) => onFieldChange("title", e.target.value)}
            placeholder="Sum it up in a few words"
            aria-invalid={errors.title ? "true" : undefined}
            aria-describedby={errors.title ? "f-title-error" : undefined}
            className={`field-input${errors.title ? " border-red-400" : ""}`}
          />
          {errors.title && (
            <p id="f-title-error" className="text-xs text-error mt-1">
              {errors.title}
            </p>
          )}
        </div>

        <div>
          <label className="field-label" htmlFor="f-content">
            Review content
          </label>
          <textarea
            id="f-content"
            ref={registerRef("content")}
            rows={6}
            value={content}
            maxLength={MAX_CONTENT_LENGTH}
            onChange={(e) => onFieldChange("content", e.target.value)}
            placeholder="What did the reviewer think of the product?"
            aria-invalid={errors.content ? "true" : undefined}
            aria-describedby={errors.content ? "f-content-error" : undefined}
            className={`w-full p-3 rounded-xl bg-slate-100 dark:bg-darksurface2 border ${
              errors.content ? "border-red-400" : "border-transparent"
            } focus:border-primary-400 dark:focus:border-accent-500 focus:bg-white dark:focus:bg-darksurface2 focus:outline-none focus:ring-4 focus:ring-primary-500/10 text-sm transition-all font-medium text-slate-800 dark:text-white resize-y`}
          />
          <div className="flex items-start justify-between gap-3 mt-1">
            {errors.content ? (
              <p id="f-content-error" className="text-xs text-error">
                {errors.content}
              </p>
            ) : (
              <span />
            )}
            <span className="text-[11px] text-slate-400 shrink-0">
              {content.length} / {MAX_CONTENT_LENGTH}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
