export const EMPTY_CARD = {
  holder: "",
  number: "",
  expMonth: "",
  expYear: "",
  cvv: "",
  setDefault: false,
};

export const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
export const YEARS = Array.from({ length: 12 }, (_, i) => String(new Date().getFullYear() + i).slice(-2));

export function detectBrand(number) {
  const digits = number.replace(/\D/g, "");
  if (/^4/.test(digits)) return "Visa";
  if (/^5[1-5]/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "American Express";
  if (/^6(?:011|5)/.test(digits)) return "Discover";
  return "Card";
}

export function formatCardNumber(value) {
  return value
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}
