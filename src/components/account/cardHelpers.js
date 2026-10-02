// Pure card logic for the Payment methods page: brand detection, number and
// expiry formatting/validation. The browser derives the brand and last four
// digits itself and sends only those; the full number never leaves the form.
// Nothing here touches the DOM or the network.

export const CARD_BRAND_LABELS = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  diners: "Diners Club",
  jcb: "JCB",
  other: "Card",
};

export const digitsOnly = (value) => String(value ?? "").replace(/\D/g, "");

export function detectBrand(number) {
  const digits = digitsOnly(number);
  if (digits.startsWith("4")) return "visa";
  if (/^5[1-5]/.test(digits)) return "mastercard";
  if (digits.length >= 4) {
    const firstFour = Number(digits.slice(0, 4));
    if (firstFour >= 2221 && firstFour <= 2720) return "mastercard"; // Mastercard's 2-series range
    if (firstFour >= 3528 && firstFour <= 3589) return "jcb";
  }
  if (/^3[47]/.test(digits)) return "amex";
  if (/^(6011|65|64[4-9])/.test(digits)) return "discover";
  if (/^3(0[0-5]|[68])/.test(digits)) return "diners";
  return "other";
}

const maxDigitsFor = (brand) => (brand === "amex" ? 15 : brand === "diners" ? 14 : 19);

// "4242424242424242" -> "4242 4242 4242 4242" (American Express groups 4-6-5, Diners 4-6-4).
export function formatCardNumber(value) {
  const digits = digitsOnly(value);
  const brand = detectBrand(digits);
  const trimmed = digits.slice(0, maxDigitsFor(brand));
  if (brand === "amex" || brand === "diners") {
    return [trimmed.slice(0, 4), trimmed.slice(4, 10), trimmed.slice(10)].filter(Boolean).join(" ");
  }
  return trimmed.replace(/(.{4})/g, "$1 ").trim();
}

function luhnValid(digits) {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

// Returns an error message, or "" when the number looks like a real card number.
export function validateCardNumber(value) {
  const digits = digitsOnly(value);
  if (!digits) return "Enter your card number.";
  const brand = detectBrand(digits);
  const lengthOk = brand === "amex" ? digits.length === 15 : brand === "diners" ? digits.length >= 14 : digits.length >= 13 && digits.length <= 19;
  if (!lengthOk || !luhnValid(digits)) return "That card number doesn't look right. Check it and try again.";
  return "";
}

// "5" -> "05", "1226" -> "12/26": keeps the field in MM/YY shape as the customer types.
export function formatExpiryInput(value) {
  let digits = digitsOnly(value).slice(0, 4);
  if (digits.length === 1 && Number(digits) > 1) digits = `0${digits}`;
  return digits.length >= 3 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

export function isCardExpired(expMonth, expYear, now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return expYear < year || (expYear === year && expMonth < month);
}

// Whole months from now until the card's last valid month (0 = it expires this month).
export function monthsUntilExpiry(expMonth, expYear, now = new Date()) {
  return (expYear - now.getFullYear()) * 12 + (expMonth - (now.getMonth() + 1));
}

// Reads "MM/YY" (or "MM/YYYY"). Returns { error } or { month, year } with a 4-digit year.
export function parseExpiry(value, now = new Date()) {
  const match = String(value ?? "").trim().match(/^(\d{1,2})\s*\/\s*(\d{2}|\d{4})$/);
  if (!match) return { error: "Enter the expiry date as MM/YY." };
  const month = Number(match[1]);
  const year = match[2].length === 2 ? 2000 + Number(match[2]) : Number(match[2]);
  if (month < 1 || month > 12) return { error: "Enter a valid month (01-12)." };
  if (isCardExpired(month, year, now)) return { error: "That card has expired." };
  if (year > now.getFullYear() + 20) return { error: "Enter a valid expiry year." };
  return { month, year };
}

export function formatExpiry(expMonth, expYear) {
  return `${String(expMonth).padStart(2, "0")}/${String(expYear).slice(-2)}`;
}

// "Visa ending in 4242", for screen readers and confirm boxes.
export function describeCard(card) {
  return `${CARD_BRAND_LABELS[card.brand] || "Card"} ending in ${card.last4}`;
}
