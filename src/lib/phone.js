// All phone numbers captured in the app are stored/displayed in US format,
// regardless of the address's selected country.
export function formatUsPhone(value) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  const area = digits.slice(0, 3);
  const prefix = digits.slice(3, 6);
  const line = digits.slice(6, 10);
  if (digits.length > 6) return `(${area}) ${prefix}-${line}`;
  if (digits.length > 3) return `(${area}) ${prefix}`;
  if (digits.length > 0) return `(${area}`;
  return "";
}

// Phone is optional everywhere it's used; when present it must be a full
// 10-digit US number.
export function isValidUsPhone(value) {
  const digits = (value || "").replace(/\D/g, "");
  return digits.length === 0 || digits.length === 10;
}
