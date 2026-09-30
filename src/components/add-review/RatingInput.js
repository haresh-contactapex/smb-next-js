"use client";

import { useState } from "react";
import Icon from "@/components/admin-panel/Icon";
import { RATING_MAX, RATING_MIN } from "@/lib/reviewFields";

const STARS = Array.from({ length: RATING_MAX - RATING_MIN + 1 }, (_, i) => RATING_MIN + i);

/**
 * Star picker built on native radio inputs, so arrow keys, focus and screen
 * readers behave like any other radio group. The stars are just the labels.
 */
export default function RatingInput({ value, error, onChange, inputRef }) {
  const [hovered, setHovered] = useState(0);
  const shown = hovered || value;

  return (
    <fieldset aria-describedby={error ? "f-rating-error" : undefined}>
      <legend className="field-label">Rating</legend>
      <div className="flex items-center gap-3">
        <div className="flex items-center" onMouseLeave={() => setHovered(0)}>
          {STARS.map((star) => (
            <label key={star} onMouseEnter={() => setHovered(star)} className="relative cursor-pointer p-0.5">
              <input
                ref={star === RATING_MIN ? inputRef : undefined}
                type="radio"
                name="rating"
                value={star}
                checked={value === star}
                onChange={() => onChange(star)}
                className="peer sr-only"
              />
              <span
                className={`block rounded-md transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 dark:peer-focus-visible:ring-accent-500 ${
                  star <= shown ? "text-warning" : "text-slate-300 dark:text-slate-600"
                }`}
              >
                <Icon name="star" className={`w-8 h-8 ${star <= shown ? "fill-current" : ""}`} />
              </span>
              <span className="sr-only">
                {star} star{star === 1 ? "" : "s"}
              </span>
            </label>
          ))}
        </div>
        <span className="text-xs text-slate-400">{value ? `${value} out of ${RATING_MAX}` : "Select a rating"}</span>
      </div>
      {error && (
        <p id="f-rating-error" className="text-xs text-error mt-1">
          {error}
        </p>
      )}
    </fieldset>
  );
}
