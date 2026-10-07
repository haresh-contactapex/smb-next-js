"use client";

import { useId, useState } from "react";
import {
  ENGRAVING_SAMPLE_TEXT,
  filterEngravingInput,
  invalidCharactersMessage,
  normalizeEngravingText,
} from "@/lib/engravingRules";
import EngravingFontLoader from "./EngravingFontLoader";
import { readEngravingValue } from "./engravingHelpers";

// The engraving form: the text, a live character count, the allowed-characters message, the
// font choices drawn in their own fonts, and an optional preview. Used on the product page and
// in the cart's "edit engraving" panel.
//
// `config` is { settings, fonts } from the server (src/lib/engraving.js), `value` is
// { text, fontId } held by the parent, which reads the outcome with readEngravingValue().
// Characters that aren't allowed are never accepted into the field: they are dropped as they
// are typed or pasted, and the message says what is allowed. A text that is too long can be
// typed, but is flagged and cannot be added to the cart until it is shortened.

const LABEL = "text-[14px] font-medium text-[#333333]";

export function EngravingPreview({ text, fontFamily, fontName }) {
  return (
    <div>
      <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-gray-400">Preview</p>
      <div
        role="img"
        aria-label={`Engraving preview: ${text}, in the ${fontName} font`}
        className="flex min-h-[72px] items-center justify-center rounded-lg border border-gray-200 bg-gradient-to-b from-[#F4F4F4] via-white to-[#E4E4E4] px-4 py-4 shadow-inner"
      >
        <span
          aria-hidden="true"
          style={{ fontFamily }}
          className="max-w-full break-words text-center text-[28px] leading-tight text-[#555555] [text-shadow:0_1px_0_#ffffff,0_-1px_0_rgba(0,0,0,0.22)]"
        >
          {text}
        </span>
      </div>
      <p className="mt-1.5 text-[12px] text-gray-400">Preview only. The finished engraving may look slightly different.</p>
    </div>
  );
}

export default function EngravingFields({ config, value, onChange, showHelp = true }) {
  const baseId = useId();
  const textId = `${baseId}-text`;
  const hintId = `${baseId}-hint`;
  const errorId = `${baseId}-error`;
  const fontsLabelId = `${baseId}-fonts-label`;
  const [stripped, setStripped] = useState(false);

  const { settings, fonts } = config;
  const { result, font } = readEngravingValue(value, config);
  const message = stripped ? invalidCharactersMessage(settings) : result.error;
  const over = result.length > settings.maxCharacters;
  const sample = result.ok && !result.empty ? result.text : ENGRAVING_SAMPLE_TEXT;

  function changeText(event) {
    const filtered = filterEngravingInput(event.target.value, settings);
    setStripped(filtered.removed);
    onChange({ ...value, text: filtered.value });
  }

  // Tidy the ends once the customer leaves the field (a trailing space was allowed while typing).
  function tidyText() {
    const text = normalizeEngravingText(value.text);
    if (text !== value.text) onChange({ ...value, text });
  }

  return (
    <div>
      <EngravingFontLoader fonts={fonts} />

      {showHelp && settings.helpText && <p className="mb-4 text-[14px] leading-relaxed text-[#555555]">{settings.helpText}</p>}

      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={textId} className={LABEL}>
          Engraving text <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <span id={hintId} className={`text-[13px] tabular-nums ${over ? "font-semibold text-error" : "text-gray-400"}`}>
          {result.length}/{settings.maxCharacters}
          <span className="sr-only"> characters</span>
        </span>
      </div>
      <input
        id={textId}
        type="text"
        value={value.text}
        onChange={changeText}
        onBlur={tidyText}
        placeholder={`e.g. ${ENGRAVING_SAMPLE_TEXT}`}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        aria-invalid={Boolean(message) || undefined}
        aria-describedby={`${hintId}${message ? ` ${errorId}` : ""}`}
        className={`mt-1.5 block h-11 w-full rounded border px-3 text-[16px] text-[#333333] outline-none transition-colors placeholder:text-gray-300 focus:border-[#ef9822] focus:ring-1 focus:ring-[#ef9822] ${
          message ? "border-error bg-red-50" : "border-gray-300"
        }`}
      />
      <p id={errorId} role="status" className={`text-[13px] text-error ${message ? "mt-1.5" : ""}`}>
        {message}
      </p>

      <div role="radiogroup" aria-labelledby={fontsLabelId} className="mt-4">
        <p id={fontsLabelId} className={LABEL}>
          Font: <span className="font-normal text-gray-500">{font?.name}</span>
        </p>
        <div className="mt-2 grid max-h-[236px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
          {fonts.map((option) => {
            const checked = font?.id === option.id;
            return (
              <label key={option.id} className="cursor-pointer">
                <input
                  type="radio"
                  name={`${baseId}-font`}
                  value={option.id}
                  checked={checked}
                  onChange={() => onChange({ ...value, fontId: option.id })}
                  className="peer sr-only"
                />
                <span
                  className={`flex h-full min-h-[64px] flex-col items-center justify-center gap-0.5 rounded border px-2 py-2 text-center transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#ef9822] peer-focus-visible:ring-offset-1 ${
                    checked ? "border-[#1c3b6a] bg-[#1c3b6a]/5 ring-1 ring-[#1c3b6a]" : "border-gray-300 hover:border-[#ef9822]"
                  }`}
                >
                  <span style={{ fontFamily: option.fontFamily }} className="block max-w-full truncate text-[22px] leading-tight text-[#333333]">
                    {sample}
                  </span>
                  <span className="text-[11px] text-gray-500">{option.name}</span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {result.ok && !result.empty && font && (
        <div className="mt-4">
          <EngravingPreview text={result.text} fontFamily={font.fontFamily} fontName={font.name} />
        </div>
      )}
    </div>
  );
}
