// Metal color swatches shared by the listing filter and the product page.
export const METALS = [
  { code: "14KR", color: "#E5B5A3" },
  { code: "18KR", color: "#E5B5A3" },
  { code: "14KW", color: "#E0E0E0" },
  { code: "18KW", color: "#E0E0E0" },
  { code: "14KY", color: "#E8C581" },
  { code: "18KY", color: "#E8C581" },
  { code: "PT", color: "#D4D4D4" },
];

const ROSE = "#E5B5A3";
const WHITE = "#E0E0E0";
const YELLOW = "#E8C581";
const PLATINUM = "#D4D4D4";

// Swatch color for an option value such as "14KW" or "14K White Gold";
// null when the value isn't a recognizable metal.
export function metalColor(value) {
  const text = String(value ?? "").trim().toLowerCase();
  const exact = METALS.find((metal) => metal.code.toLowerCase() === text);
  if (exact) return exact.color;
  if (/platinum|^pt\d*$/.test(text)) return PLATINUM;
  if (/rose|^\d+k?r$/.test(text)) return ROSE;
  if (/yellow|^\d+k?y$/.test(text)) return YELLOW;
  if (/white|^\d+k?w$/.test(text)) return WHITE;
  return null;
}
