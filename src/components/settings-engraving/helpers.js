// Form <-> API conversion, client-side validation and small list helpers for Settings > Engraving.
// What counts as valid is decided by src/lib/engravingRules.js (the same module the server runs),
// so nothing about the rules is repeated here: this file only shapes data for the form.

import {
  cleanAllowedSymbols,
  sanitizeEngravingSettings,
  validateEngravingFont,
  validateEngravingSettings,
} from "@/lib/engravingRules";

// --- Element ids (used for label/for pairs and to focus the first invalid control) ---------

export const SETTINGS_FIELD_IDS = {
  maxCharacters: "engraving-max-characters",
  characters: "engraving-allowed-characters",
  helpText: "engraving-help-text",
};
export const ADD_FONT_ID = "engraving-add-font";
export const CATEGORY_SEARCH_ID = "engraving-category-search";

// field is "name" | "fontFamily" | "googleFont" | "edit" | "up" | "down" | "panel"
export const fontFieldId = (key, field) => `engraving-font-${key}-${field}`;

// Top-to-bottom order the "focus the first bad field" behavior follows.
const SETTINGS_FIELD_ORDER = ["maxCharacters", "characters", "helpText"];
const FONT_FIELD_ORDER = ["name", "fontFamily", "googleFont"];
// Every control that feeds the single "Allowed characters" error.
const CHARACTER_FIELDS = ["allowLetters", "allowNumbers", "allowSpaces", "allowedSymbols"];

export const NO_ERRORS = Object.freeze({ settings: {}, fonts: {} });

// Which error message a changed setting should clear.
export const settingErrorKey = (field) => (CHARACTER_FIELDS.includes(field) ? "characters" : field);

// Focuses the control with this id, or the first control inside it (for a fieldset), and can
// scroll it to the middle of the screen so the error next to it is seen.
export function focusControl(id, { center = false } = {}) {
  if (typeof document === "undefined") return;
  const element = document.getElementById(id);
  if (!element) return;
  const control = element.matches("input, button, select, textarea")
    ? element
    : element.querySelector("input:not([disabled]), button:not([disabled])");
  if (!control) return;
  control.focus({ preventScroll: center });
  if (center) {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    control.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
  }
}

// --- Symbols ---------------------------------------------------------------------------

const SYMBOL_NAMES = {
  "&": "Ampersand",
  ".": "Full stop",
  ",": "Comma",
  "'": "Apostrophe",
  "-": "Hyphen",
  "!": "Exclamation mark",
  "?": "Question mark",
  "/": "Slash",
  "(": "Opening parenthesis",
  ")": "Closing parenthesis",
  "#": "Hash",
  "@": "At sign",
  "+": "Plus",
  ":": "Colon",
  "*": "Asterisk",
  _: "Underscore",
};

export const symbolName = (char) => SYMBOL_NAMES[char] || char;

// Adds or removes one symbol. The result is kept in the order of ENGRAVING_SYMBOL_CHOICES.
export function toggleSymbol(current, char) {
  const symbols = new Set(String(current ?? ""));
  if (symbols.has(char)) symbols.delete(char);
  else symbols.add(char);
  return cleanAllowedSymbols([...symbols].join(""));
}

// --- Fonts -----------------------------------------------------------------------------

// Every font row carries a client-only `key`: a new font has no id until the server makes one,
// and the key keeps React rows, focus targets and error messages tied to the right row.
// It contains an underscore, which a real font id (a slug) never does.
let fontKeySeq = 0;
const nextFontKey = () => `f_${++fontKeySeq}`;

export function blankFont() {
  return { key: nextFontKey(), id: "", name: "", fontFamily: "", googleFont: "", enabled: true };
}

function toFormFont(font) {
  return {
    key: nextFontKey(),
    id: typeof font?.id === "string" ? font.id : "",
    name: String(font?.name ?? ""),
    fontFamily: String(font?.fontFamily ?? ""),
    googleFont: String(font?.googleFont ?? ""),
    enabled: font?.enabled !== false,
  };
}

export const fontLabel = (font) => font.name.trim() || "untitled font";

export function countFonts(fonts) {
  return { total: fonts.length, enabled: fonts.filter((font) => font.enabled).length };
}

// Returns a new list with the item at `index` moved by `delta` places (-1 up, +1 down), or the
// same list when that would fall off either end.
export function moveItem(list, index, delta) {
  const target = index + delta;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

// --- API data <-> form state -----------------------------------------------------------

// `data` is what GET/PUT /api/settings/engraving returns inside { success, data }. Any shape is
// accepted (null gives the defaults).
export function toFormState(data) {
  const settings = sanitizeEngravingSettings(data?.settings);
  const fonts = Array.isArray(data?.fonts) ? [...data.fonts] : [];
  fonts.sort((a, b) => (Number(a?.position) || 0) - (Number(b?.position) || 0));
  return {
    // The number input is edited as text so it can be cleared and retyped.
    settings: { ...settings, maxCharacters: String(settings.maxCharacters) },
    categoryIds: Array.isArray(data?.categoryIds)
      ? [...new Set(data.categoryIds.filter((id) => typeof id === "string"))]
      : [],
    fonts: fonts.map(toFormFont),
  };
}

// The categories the search box picks from: { id, name, path, productCount }.
export function toCategoryList(data) {
  if (!Array.isArray(data?.categories)) return [];
  return data.categories
    .filter((category) => category && category.id)
    .map((category) => ({
      id: String(category.id),
      name: String(category.name ?? ""),
      path: String(category.path || category.name || ""),
      productCount: Number(category.productCount) || 0,
    }));
}

// The PUT body. Selected categories that no longer exist are dropped here rather than sent.
export function toSavePayload(form, categories) {
  const known = new Set(categories.map((category) => category.id));
  const { settings } = form;
  return {
    settings: {
      enabled: Boolean(settings.enabled),
      maxCharacters: Number(settings.maxCharacters),
      allowLetters: Boolean(settings.allowLetters),
      allowNumbers: Boolean(settings.allowNumbers),
      allowSpaces: Boolean(settings.allowSpaces),
      allowedSymbols: cleanAllowedSymbols(settings.allowedSymbols),
      helpText: settings.helpText,
    },
    categoryIds: form.categoryIds.filter((id) => known.has(id)),
    // A new font is sent with id "" and the server derives a stable id from its name. The array
    // order is the display order.
    fonts: form.fonts.map((font) => ({
      id: font.id,
      name: font.name,
      fontFamily: font.fontFamily,
      googleFont: font.googleFont,
      enabled: font.enabled,
    })),
  };
}

// --- Validation ------------------------------------------------------------------------

// Returns { valid, settingsErrors, fontErrors, firstId, firstFontKey, message }.
//   settingsErrors: { maxCharacters?, characters?, helpText? }
//   fontErrors:     { [font.key]: { name?, fontFamily?, googleFont? } }
//   firstId:        element id of the first invalid control, top to bottom
export function validateEngravingForm(form) {
  const settingsErrors = validateEngravingSettings(form.settings).errors;
  const fontErrors = {};

  let first = null;
  for (const field of SETTINGS_FIELD_ORDER) {
    if (settingsErrors[field]) {
      first = { id: SETTINGS_FIELD_IDS[field], fontKey: null, message: settingsErrors[field] };
      break;
    }
  }

  form.fonts.forEach((font, index) => {
    const { errors } = validateEngravingFont(font);
    const field = FONT_FIELD_ORDER.find((name) => errors[name]);
    if (!field) return;
    fontErrors[font.key] = errors;
    if (!first) {
      const named = font.name.trim() ? ` (${font.name.trim()})` : "";
      first = {
        id: fontFieldId(font.key, field),
        fontKey: font.key,
        message: `Font ${index + 1}${named}: ${errors[field]}`,
      };
    }
  });

  return {
    valid: !first,
    settingsErrors,
    fontErrors,
    firstId: first?.id ?? null,
    firstFontKey: first?.fontKey ?? null,
    message: first?.message ?? "",
  };
}

// Maps the `field` a failed PUT reports ("maxCharacters", "characters", "helpText" or
// "fonts.3.fontFamily") onto the form so the message shows next to the control. Returns null
// for a field this page doesn't show.
export function applyServerFieldError(field, message, form) {
  if (typeof field !== "string") return null;

  if (SETTINGS_FIELD_IDS[field]) {
    return { settingsErrors: { [field]: message }, fontErrors: {}, id: SETTINGS_FIELD_IDS[field], fontKey: null };
  }

  const match = /^fonts\.(\d+)\.(name|fontFamily|googleFont)$/.exec(field);
  if (!match) return null;
  const font = form.fonts[Number(match[1])];
  if (!font) return null;
  const plain = message.replace(/^Font \d+(?: \([^)]*\))?: /, "");
  return {
    settingsErrors: {},
    fontErrors: { [font.key]: { [match[2]]: plain } },
    id: fontFieldId(font.key, match[2]),
    fontKey: font.key,
  };
}
