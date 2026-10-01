"use client";

import { useId } from "react";
import { metalColor } from "../metals";

const STATE_SUFFIX = { soldout: " (sold out)", unavailable: " (unavailable)" };

// One editable option of a cart line (Color, Size, ...): an underlined native
// select, with a metal swatch beside it for color options. `choices` come from
// optionChoices(); values that can't be switched to are disabled and say why.
// `inset` leaves a little room before the selected value, so it doesn't sit
// against the left edge of the field or its focus ring.
export default function CartOptionSelect({ name, value, choices, swatch = false, disabled = false, inset = false, onChange }) {
  const id = useId();
  const color = swatch ? metalColor(value) : null;

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#555555]">
        {name}
      </label>
      <div className="relative flex items-center gap-2.5 border-b border-gray-400 transition-colors focus-within:border-[#ef9822] hover:border-[#ef9822]">
        {color && <span aria-hidden="true" style={{ backgroundColor: color }} className="h-[22px] w-[22px] flex-shrink-0 rounded-full ring-1 ring-gray-300" />}
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={`min-w-[4.5rem] cursor-pointer appearance-none bg-transparent py-2 pr-7 ${inset ? "pl-3" : ""} text-[13px] font-medium uppercase tracking-wide text-[#333333] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ef9822] disabled:cursor-default`}
        >
          {choices.map((choice) => (
            <option key={choice.value} value={choice.value} disabled={choice.state === "soldout" || choice.state === "unavailable"}>
              {choice.value}
              {STATE_SUFFIX[choice.state] || ""}
            </option>
          ))}
        </select>
        {!disabled && (
          <svg
            className="pointer-events-none absolute right-0 h-4 w-4 text-gray-500"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
          </svg>
        )}
      </div>
    </div>
  );
}
