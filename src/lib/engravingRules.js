// Engraving / personalization rules that do not need a database: what text is allowed, how a
// product's engraving setting is resolved, and how an engraved cart line is described and
// keyed. Nothing here touches the DOM or the network, so the product page, the cart, the
// checkout server and the admin settings all share one copy and cannot drift apart.
//
// The server never trusts what the browser says about engraving: checkoutPricing.js runs
// every line through validateEngravingText() with the store's current settings again.

export const ENGRAVING_MODES = ["inherit", "enabled", "disabled"];
export const DEFAULT_ENGRAVING_MODE = "inherit";

// The most the settings page can allow, and the most any request is ever accepted with.
export const ENGRAVING_ABSOLUTE_MAX = 50;
export const DEFAULT_ENGRAVING_MAX = 20;
// Width of order_line_items.engraving_text. Longer input is cut to this so it still fails
// the length check instead of failing deep inside the database.
export const ENGRAVING_STORED_MAX = 100;
export const ENGRAVING_HELP_MAX = 500;
export const ENGRAVING_FONT_NAME_MAX = 60;
export const ENGRAVING_FONT_FAMILY_MAX = 200;
export const MAX_ENGRAVING_FONTS = 60;
export const ENGRAVING_SAMPLE_TEXT = "Forever";

// The basic symbols an admin can allow, plain ASCII punctuation that engraves cleanly.
// No quotes of the double kind, brackets, backslash, `=`, `<`, `>` or `%`: they have no
// place on a ring and several of them cause trouble in spreadsheets and markup.
export const ENGRAVING_SYMBOL_CHOICES = "&.,'-!?/()#@+:*_";
export const DEFAULT_ALLOWED_SYMBOLS = "&.,'-!?/()#";
export const DEFAULT_ENGRAVING_HELP =
  "Add a personal message to your band. Please double-check the spelling, because the engraving is made exactly as you type it.";

export const DEFAULT_ENGRAVING_SETTINGS = Object.freeze({
  enabled: true,
  maxCharacters: DEFAULT_ENGRAVING_MAX,
  allowLetters: true,
  allowNumbers: true,
  allowSpaces: true,
  allowedSymbols: DEFAULT_ALLOWED_SYMBOLS,
  helpText: DEFAULT_ENGRAVING_HELP,
});

// --- Settings -----------------------------------------------------------------------

// Keeps only the symbols from ENGRAVING_SYMBOL_CHOICES, once each, in that order.
export function cleanAllowedSymbols(value) {
  const wanted = new Set(String(value ?? ""));
  return [...ENGRAVING_SYMBOL_CHOICES].filter((char) => wanted.has(char)).join("");
}

export function clampMaxCharacters(value) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) return DEFAULT_ENGRAVING_MAX;
  return Math.min(ENGRAVING_ABSOLUTE_MAX, Math.max(1, number));
}

const stripControls = (value) => String(value ?? "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, " ");

export function cleanHelpText(value) {
  return stripControls(value).replace(/[<>]/g, "").trim().slice(0, ENGRAVING_HELP_MAX);
}

// Any shape of settings (a database row's values, a request body, nothing at all) becomes a
// complete, valid settings object.
export function sanitizeEngravingSettings(raw) {
  const input = raw && typeof raw === "object" ? raw : {};
  const defaults = DEFAULT_ENGRAVING_SETTINGS;
  const flag = (value, fallback) => (typeof value === "boolean" ? value : fallback);
  return {
    enabled: flag(input.enabled, defaults.enabled),
    maxCharacters: clampMaxCharacters(input.maxCharacters ?? defaults.maxCharacters),
    allowLetters: flag(input.allowLetters, defaults.allowLetters),
    allowNumbers: flag(input.allowNumbers, defaults.allowNumbers),
    allowSpaces: flag(input.allowSpaces, defaults.allowSpaces),
    allowedSymbols: input.allowedSymbols === undefined ? defaults.allowedSymbols : cleanAllowedSymbols(input.allowedSymbols),
    helpText: input.helpText === undefined ? defaults.helpText : cleanHelpText(input.helpText),
  };
}

// What the settings page checks before it saves. Returns { errors: { field: message } }.
export function validateEngravingSettings(settings) {
  const errors = {};
  const max = Number(settings.maxCharacters);
  if (!Number.isInteger(max) || max < 1 || max > ENGRAVING_ABSOLUTE_MAX) {
    errors.maxCharacters = `Enter a whole number from 1 to ${ENGRAVING_ABSOLUTE_MAX}.`;
  }
  if (!settings.allowLetters && !settings.allowNumbers && !settings.allowSpaces && !settings.allowedSymbols) {
    errors.characters = "Allow at least one kind of character.";
  } else if (!settings.allowLetters && !settings.allowNumbers && !settings.allowedSymbols) {
    errors.characters = "Allow letters, numbers or symbols, not only spaces.";
  }
  if (String(settings.helpText ?? "").length > ENGRAVING_HELP_MAX) {
    errors.helpText = `Keep the help text to ${ENGRAVING_HELP_MAX} characters or fewer.`;
  }
  return { errors, valid: Object.keys(errors).length === 0 };
}

// --- The engraving text ---------------------------------------------------------------

// Trims the ends, turns tabs, line breaks and other whitespace into single spaces and drops
// invisible characters. Input is capped first so a huge paste can't make this slow.
export function normalizeEngravingText(raw) {
  if (typeof raw !== "string") return "";
  return raw
    .slice(0, 1000)
    .replace(/[​-‍⁠﻿]/g, "")
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isAllowedEngravingChar(char, settings) {
  if (!char) return false;
  if (/^[A-Za-z]$/.test(char)) return Boolean(settings.allowLetters);
  if (/^[0-9]$/.test(char)) return Boolean(settings.allowNumbers);
  if (char === " ") return Boolean(settings.allowSpaces);
  return String(settings.allowedSymbols || "").includes(char);
}

export function invalidEngravingCharacters(text, settings) {
  const invalid = [];
  for (const char of text) {
    if (!isAllowedEngravingChar(char, settings) && !invalid.includes(char)) invalid.push(char);
  }
  return invalid;
}

// "letters, numbers, spaces, and basic symbols" with everything on (the default).
export function describeAllowedCharacters(settings) {
  const parts = [];
  if (settings.allowLetters) parts.push("letters");
  if (settings.allowNumbers) parts.push("numbers");
  if (settings.allowSpaces) parts.push("spaces");
  if (settings.allowedSymbols) parts.push("basic symbols");
  if (parts.length <= 1) return parts[0] || "";
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

export function invalidCharactersMessage(settings) {
  const allowed = describeAllowedCharacters(settings);
  return allowed ? `Please use only ${allowed}.` : "Engraving isn't available right now.";
}

// Checks one piece of engraving text against the store's rules. Empty text is fine (engraving
// is optional) and comes back as `empty`. `text` is the normalized text that should be used.
//   code: null | "invalid_characters" | "too_long"
export function validateEngravingText(raw, settings) {
  const text = normalizeEngravingText(raw);
  const length = [...text].length;
  const base = { text, length, empty: length === 0, ok: true, code: null, error: "", invalid: [] };
  if (base.empty) return base;

  const invalid = invalidEngravingCharacters(text, settings);
  if (invalid.length > 0) return { ...base, ok: false, code: "invalid_characters", error: invalidCharactersMessage(settings), invalid };

  if (length > settings.maxCharacters) {
    const over = length - settings.maxCharacters;
    return {
      ...base,
      ok: false,
      code: "too_long",
      error: `Engraving can be up to ${settings.maxCharacters} characters. Please remove ${over} character${over === 1 ? "" : "s"}.`,
    };
  }
  return base;
}

// For the text field's onChange: drops anything not allowed (and reports that it did), turns
// line breaks into spaces, and keeps spaces tidy (none at the start, never two in a row).
// A trailing space stays so the next word can be typed; the text is trimmed once it is used.
export function filterEngravingInput(raw, settings) {
  const source = String(raw ?? "").slice(0, 1000).replace(/[\r\n\t]+/g, " ");
  let value = "";
  let removed = false;
  for (const char of source) {
    if (isAllowedEngravingChar(char, settings)) value += char;
    else removed = true;
  }
  return { value: value.replace(/^ +/, "").replace(/ {2,}/g, " "), removed };
}

// --- Is engraving offered on this product? -----------------------------------------

export const ENGRAVING_SOURCES = {
  GLOBAL_OFF: "global-off",
  PRODUCT_ENABLED: "product-enabled",
  PRODUCT_DISABLED: "product-disabled",
  CATEGORY: "category",
  NONE: "none",
};

export const normalizeEngravingMode = (value) => (ENGRAVING_MODES.includes(value) ? value : DEFAULT_ENGRAVING_MODE);

// The one place the priority is decided:
//   engraving off in Settings  -> hidden everywhere
//   product set to Enabled     -> shown
//   product set to Disabled    -> hidden, whatever its categories say
//   product set to Inherit     -> shown only if it is in an engraving category
// `source` says why, so the admin (and the code) can tell an explicit choice from one inherited.
export function resolveEngravingAvailability({ globalEnabled, productMode, inEnabledCategory }) {
  if (!globalEnabled) return { available: false, source: ENGRAVING_SOURCES.GLOBAL_OFF };
  const mode = normalizeEngravingMode(productMode);
  if (mode === "enabled") return { available: true, source: ENGRAVING_SOURCES.PRODUCT_ENABLED };
  if (mode === "disabled") return { available: false, source: ENGRAVING_SOURCES.PRODUCT_DISABLED };
  if (inEnabledCategory) return { available: true, source: ENGRAVING_SOURCES.CATEGORY };
  return { available: false, source: ENGRAVING_SOURCES.NONE };
}

// --- Fonts --------------------------------------------------------------------------

export const FONT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,59}$/;
// A CSS font-family list. No parentheses, so no url() or other function can sneak in.
const FONT_FAMILY_PATTERN = /^[A-Za-z0-9 ,'"_-]+$/;
const GOOGLE_FONT_PATTERN = /^[A-Za-z0-9 ]+$/;

const cleanLabel = (value, max) => stripControls(value).replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);

export const cleanFontName = (value) => cleanLabel(value, ENGRAVING_FONT_NAME_MAX);

export function slugifyFontId(name) {
  return String(name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// One font from a request or the settings form, checked field by field.
// Returns { font, errors }: `font` is the clean record, `errors` has a message per bad field.
export function validateEngravingFont(raw) {
  const input = raw && typeof raw === "object" ? raw : {};
  const errors = {};

  const name = cleanFontName(input.name);
  if (!name) errors.name = "Enter a font name.";

  const fontFamily = String(input.fontFamily ?? "").replace(/\s+/g, " ").trim();
  if (!fontFamily) errors.fontFamily = "Enter the CSS font family, for example Allura, cursive.";
  else if (fontFamily.length > ENGRAVING_FONT_FAMILY_MAX || !FONT_FAMILY_PATTERN.test(fontFamily)) {
    errors.fontFamily = "Use only letters, numbers, spaces, commas, hyphens and quotes in the font family.";
  }

  const googleFont = String(input.googleFont ?? "").replace(/\s+/g, " ").trim();
  if (googleFont && (googleFont.length > 60 || !GOOGLE_FONT_PATTERN.test(googleFont))) {
    errors.googleFont = "Use the Google Fonts family name, letters, numbers and spaces only.";
  }

  const suppliedId = String(input.id ?? "").trim();
  const id = FONT_ID_PATTERN.test(suppliedId) ? suppliedId : slugifyFontId(name);
  if (!errors.name && !FONT_ID_PATTERN.test(id)) errors.name = "Use at least one letter or number in the font name.";

  return {
    errors,
    font: { id, name, fontFamily, googleFont, enabled: input.enabled !== false },
  };
}

// The Google Fonts stylesheet for the fonts that name one, or null when there is nothing to load.
// Built only from names that passed GOOGLE_FONT_PATTERN, so it can only ever ask Google for fonts.
export function engravingFontsHref(fonts) {
  const families = [
    ...new Set(
      (fonts || [])
        .map((font) => String(font?.googleFont || "").trim())
        .filter((name) => name && name.length <= 60 && GOOGLE_FONT_PATTERN.test(name))
    ),
  ];
  if (families.length === 0) return null;
  return `https://fonts.googleapis.com/css2?${families.map((name) => `family=${name.replace(/ /g, "+")}`).join("&")}&display=swap`;
}

// --- An engraved cart line -------------------------------------------------------------

// The shape kept on a cart line and sent with an order: { text, fontId, fontName }. Anything
// else the browser holds is dropped. Returns null when there is no engraving text. A line
// whose font id is not a valid slug keeps `fontId: ""` so the caller can reject it.
export function sanitizeLineEngraving(raw) {
  if (!raw || typeof raw !== "object") return null;
  const text = normalizeEngravingText(raw.text).slice(0, ENGRAVING_STORED_MAX);
  if (!text) return null;
  const fontId = typeof raw.fontId === "string" && FONT_ID_PATTERN.test(raw.fontId) ? raw.fontId : "";
  return { text, fontId, fontName: cleanFontName(raw.fontName) };
}

// What makes two cart lines different: the same ring with different engraving is two lines,
// and the same ring with the same engraving is one.
export function engravingKeyPart(engraving) {
  return engraving ? `|e:${engraving.fontId}:${engraving.text}` : "";
}

// The lines shown under a product name: "Engraving: Forever", "Font: Elegant Script".
export function engravingLines(engraving) {
  if (!engraving?.text) return [];
  const lines = [{ label: "Engraving", value: engraving.text }];
  if (engraving.fontName) lines.push({ label: "Font", value: engraving.fontName });
  return lines;
}
