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

const BLACK = "#2B2B2B";

// Other metals a band can be made of, matched by name.
const OTHER_METALS = [
  [/cobalt/, "#A7B0BA"],
  [/titanium/, "#8B9097"],
  [/zirconium/, "#3B3B3D"],
  [/tungsten/, "#6E7378"],
  [/silver|stainless|steel/, "#CFCFD2"],
  [/black/, BLACK],
];

// A CSS `background` value for an option value such as "14KW", "14K White Gold" or
// "18K Rose Gold PVD and Black PVD" (drawn half gold, half black); null when the value
// isn't a recognizable metal. Use it as `background`, not `backgroundColor`.
export function metalColor(value) {
  const text = String(value ?? "").trim().toLowerCase();
  const exact = METALS.find((metal) => metal.code.toLowerCase() === text);
  if (exact) return exact.color;
  if (/platinum|^pt\d*$/.test(text)) return PLATINUM;

  const gold = /rose|^\d+k?r$/.test(text) ? ROSE : /yellow|^\d+k?y$/.test(text) ? YELLOW : /white|^\d+k?w$/.test(text) ? WHITE : null;
  if (gold && /black/.test(text)) return `linear-gradient(135deg, ${gold} 50%, ${BLACK} 50%)`;
  if (gold) return gold;
  return OTHER_METALS.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

// Neutral swatch for a metal with no known color (cobalt, titanium, ...).
export const OTHER_METAL_COLOR = "#BDBDBD";

// Short swatch caption: "14K Rose Gold" -> "14KR", "Platinum" -> "PT". Anything else
// (a PVD finish, titanium, ...) keeps its full name so nothing is mistaken for another metal.
export function metalLabel(value) {
  const text = String(value ?? "").trim();
  if (/^platinum$/i.test(text)) return "PT";
  const karat = text.match(/^(\d+)\s*k(?:t)?\s+(white|yellow|rose)\s+gold$/i);
  return karat ? `${karat[1]}K${karat[2][0].toUpperCase()}` : text;
}

const METAL_OPTION = /colou?r|metal/i;

// A color/metal option becomes swatches only when every value is a recognizable metal.
export function isMetalOption(option) {
  return METAL_OPTION.test(option.name) && option.values.every((value) => metalColor(value));
}
