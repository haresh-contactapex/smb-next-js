"use client";

import { useState } from "react";
import { Star } from "@/components/reviews/StarRating";
import { RATING_MAX, RATING_MIN, RATING_STEP, RATING_VALUES, formatRating } from "@/lib/reviewFields";

const STAR_COUNT = Math.ceil(RATING_MAX);

/**
 * Star picker that accepts whole and half stars. Each star is split into a
 * left half (worth x.5) and a right half (worth x); every half is a native
 * radio input, so the picker is one ordinary radio group: arrow keys step by
 * half a star, focus and screen readers work as usual, and the stars are just
 * the click targets.
 */
export default function RatingInput({ value, error, onChange, inputRef }) {
  const [hovered, setHovered] = useState(0);
  const shown = hovered || value;

  function renderHalf(rating, side) {
    return (
      <label
        key={rating}
        onMouseEnter={() => setHovered(rating)}
        className={`absolute inset-y-0 w-1/2 cursor-pointer ${side === "left" ? "left-0" : "right-0"}`}
      >
        <input
          ref={rating === RATING_MIN ? inputRef : undefined}
          type="radio"
          name="rating"
          value={rating}
          checked={value === rating}
          onChange={() => {
            // A pointer resting on the stars must not mask a keyboard change.
            setHovered(0);
            onChange(rating);
          }}
          className="sr-only"
        />
        <span className="sr-only">{rating === 1 ? "1 star" : `${formatRating(rating)} stars`}</span>
      </label>
    );
  }

  return (
    <fieldset aria-describedby={error ? "f-rating-error" : undefined}>
      <legend className="field-label">Rating</legend>
      <div className="flex items-center gap-3">
        <div className="flex items-center" onMouseLeave={() => setHovered(0)}>
          {Array.from({ length: STAR_COUNT }, (_, i) => {
            const whole = i + 1;
            const half = whole - RATING_STEP;
            return (
              <span
                key={whole}
                className="relative block w-8 h-8 mx-0.5 rounded-md has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500 dark:has-[:focus-visible]:ring-accent-500"
              >
                <Star fill={Math.min(1, Math.max(0, shown - i))} className="w-8 h-8" />
                {RATING_VALUES.includes(half) && renderHalf(half, "left")}
                {renderHalf(whole, "right")}
              </span>
            );
          })}
        </div>
        <span className="text-xs text-slate-400">
          {value ? `${formatRating(value)} out of ${RATING_MAX}` : "Select a rating"}
        </span>
      </div>
      {error && (
        <p id="f-rating-error" className="text-xs text-error mt-1">
          {error}
        </p>
      )}
    </fieldset>
  );
}
