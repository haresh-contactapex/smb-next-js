// Client-side glue for the engraving form. The rules themselves (what text is allowed, how long
// it may be) are in src/lib/engravingRules.js and are shared with the server, which checks every
// engraved line again when an order is placed.

import { validateEngravingText } from "@/lib/engravingRules";

// The form's starting value: no text, the first font.
export function emptyEngravingValue(config) {
  return { text: "", fontId: config?.fonts?.[0]?.id || "" };
}

// The form's value for an engraving already on a cart line.
export function valueFromEngraving(engraving, config) {
  const known = config.fonts.some((font) => font.id === engraving?.fontId);
  return { text: engraving?.text || "", fontId: known ? engraving.fontId : config.fonts[0]?.id || "" };
}

// What the form's current value amounts to:
//   result     the validation of the text (ok, empty, error, length, ...)
//   engraving  { text, fontId, fontName } to put on the cart line, or null when there is no
//              engraving to add (blank text) or it isn't valid yet
//   blocked    true when the text is invalid, so the product can't be added until it is fixed
export function readEngravingValue(value, config) {
  const result = validateEngravingText(value.text, config.settings);
  const font = config.fonts.find((candidate) => candidate.id === value.fontId) || config.fonts[0];
  const usable = result.ok && !result.empty && font;
  return {
    result,
    font,
    engraving: usable ? { text: result.text, fontId: font.id, fontName: font.name } : null,
    blocked: !result.ok || (!result.empty && !font),
  };
}
