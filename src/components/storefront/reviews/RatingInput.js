"use client";

import { useId, useState } from "react";
import StarRating from "../StarRating";
import { formatRating } from "@/lib/reviewFields";

const STARS = [1, 2, 3, 4, 5];

// Half-star picker. Ten visually hidden radios (0.5 ... 5) provide the keyboard
// (arrow keys) and screen-reader behavior; each star also has two invisible
// half-width labels over it so the mouse can choose a half or a whole star.
// Hovering previews the rating, and the first radio takes `inputRef` so the form
// can focus the control when the rating is missing.
export default function RatingInput({ value, onChange, error, disabled = false, inputRef }) {
  const name = useId();
  const [hover, setHover] = useState(0);

  return (
    <fieldset aria-describedby={error ? `${name}-error` : undefined} className="min-w-0">
      <legend className="field-label">Your Rating</legend>
      <div className="flex items-center gap-3">
        <div className="relative" onMouseLeave={() => setHover(0)}>
          <span aria-hidden="true">
            <StarRating rating={hover || value} className="h-8 w-8" />
          </span>
          <div className="absolute inset-0 flex">
            {STARS.map((star) => (
              <div key={star} className="flex h-8 w-8">
                {[star - 0.5, star].map((rating) => (
                  <label
                    key={rating}
                    onMouseEnter={() => setHover(rating)}
                    className={`h-full w-1/2 focus-within:ring-2 focus-within:ring-[#ef9822] ${disabled ? "" : "cursor-pointer"}`}
                  >
                    <input
                      ref={rating === 0.5 ? inputRef : undefined}
                      type="radio"
                      name={name}
                      value={rating}
                      checked={value === rating}
                      onChange={() => onChange(rating)}
                      disabled={disabled}
                      aria-label={`${formatRating(rating)} ${rating === 1 ? "star" : "stars"}`}
                      className="sr-only"
                    />
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>
        <span className="text-sm text-gray-500" aria-live="polite">
          {value ? `${formatRating(value)} out of 5` : "Select a rating"}
        </span>
      </div>
      <p id={`${name}-error`} role="alert" className="mt-1 text-xs text-error empty:hidden">
        {error}
      </p>
    </fieldset>
  );
}
