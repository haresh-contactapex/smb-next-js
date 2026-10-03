// Single shared money formatter so every feature displays amounts in
// whatever currency is configured on Settings -> Currency & Tax, instead of
// each component hardcoding its own symbol/locale.
export function formatCurrency(amount, currencyCode = "USD") {
  const value = Number(amount);
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).format(
      Number.isFinite(value) ? value : 0
    );
  } catch {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
      Number.isFinite(value) ? value : 0
    );
  }
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
