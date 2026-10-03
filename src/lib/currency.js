// Single shared money formatter so every feature displays amounts in
// whatever currency is configured on Settings -> Currency & Tax, instead of
// each component hardcoding its own symbol/locale.
//
// `format` is the store's { position, numberFormat } from that same page:
// where the symbol goes ("before" | "after") and how digits are grouped
// ("1,234.56" | "1.234,56" | "1 234.56"). Omit it for the US default.
export const DEFAULT_MONEY_FORMAT = { position: "before", numberFormat: "1,234.56" };

const NUMBER_SEPARATORS = {
  "1,234.56": { group: ",", decimal: "." },
  "1.234,56": { group: ".", decimal: "," },
  "1 234.56": { group: " ", decimal: "." },
};

function currencyParts(value, currencyCode, extra = {}) {
  const options = { style: "currency", currency: currencyCode, ...extra };
  try {
    return new Intl.NumberFormat("en-US", options).formatToParts(value);
  } catch {
    return new Intl.NumberFormat("en-US", { ...options, currency: "USD" }).formatToParts(value);
  }
}

// Rebuilds Intl's en-US parts with the store's symbol position and separators.
function assemble(parts, format) {
  const symbolAfter = format?.position === "after";
  const separators = NUMBER_SEPARATORS[format?.numberFormat] || NUMBER_SEPARATORS["1,234.56"];
  if (!symbolAfter && separators === NUMBER_SEPARATORS["1,234.56"]) return parts.map((part) => part.value).join("");

  let sign = "";
  let symbol = "";
  let digits = "";
  for (const part of parts) {
    if (part.type === "currency") symbol = part.value;
    else if (part.type === "minusSign") sign = part.value;
    else if (part.type === "group") digits += separators.group;
    else if (part.type === "decimal") digits += separators.decimal;
    else if (part.type === "integer" || part.type === "fraction" || part.type === "compact") digits += part.value;
  }
  return symbolAfter ? `${sign}${digits}${symbol}` : `${sign}${symbol}${digits}`;
}

const finite = (amount) => (Number.isFinite(Number(amount)) ? Number(amount) : 0);

export function formatCurrency(amount, currencyCode = "USD", format = DEFAULT_MONEY_FORMAT) {
  return assemble(currencyParts(finite(amount), currencyCode), format);
}

// "$1.2K" / "1.2K$" / "1,2K€": for chart axes and tiles where space is tight.
export function formatCompactCurrency(amount, currencyCode = "USD", format = DEFAULT_MONEY_FORMAT) {
  return assemble(currencyParts(finite(amount), currencyCode, { notation: "compact", maximumFractionDigits: 1 }), format);
}

// Wrapper props for an amount <input> with the currency symbol inside it: the
// symbol sits before or after the digits per the store's position setting, and
// the field's padding grows with longer symbols such as "CA$" (see .prefix-wrap).
export function moneyInputWrap(currencyCode, position) {
  const symbol = getCurrencySymbol(currencyCode);
  return {
    symbol,
    className: `prefix-wrap${position === "after" ? " symbol-after" : ""}`,
    style: { "--sign-pad": `${0.9 + 0.6 * symbol.length}rem` },
  };
}

export function getCurrencySymbol(currencyCode = "USD") {
  try {
    const parts = new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).formatToParts(0);
    return parts.find((part) => part.type === "currency")?.value || "$";
  } catch {
    return "$";
  }
}

// The amount in the currency's smallest unit (cents for most, whole yen, thousandths
// of a dinar), which is what payment gateways take.
export function toMinorUnits(amount, currencyCode = "USD") {
  let digits = 2;
  try {
    digits = new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).resolvedOptions().maximumFractionDigits;
  } catch {
    // Unknown code: assume two decimal places.
  }
  return Math.round(Number(amount) * 10 ** digits);
}
