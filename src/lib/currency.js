// Single shared money formatter so every feature displays amounts in
// whatever currency is configured on Settings -> General, instead of each
// component hardcoding its own symbol/locale.
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
