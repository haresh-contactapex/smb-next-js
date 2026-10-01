import { getCurrencyTaxSettings } from "./currencyTaxSettings";
import { getPaymentSettings } from "./paymentSettings";

// Server side of the storefront checkout page. The cart itself lives in the
// visitor's browser (see storefrontCart.js); this only reads the two store
// settings the page needs and hands over the public parts. Gateway keys in the
// payment settings never leave the server.

async function readOrNull(label, read) {
  try {
    return await read();
  } catch (error) {
    // Both are extras: if the database is unavailable the page still renders.
    console.error(`Checkout ${label} settings failed to load`, error);
    return null;
  }
}

function toTax(settings) {
  if (!settings) return null;
  return {
    pricesIncludeTax: Boolean(settings.pricesIncludeTax),
    rate: Number(settings.defaultTaxRate) || 0,
    applyToShipping: Boolean(settings.applyTaxToShipping),
  };
}

// The payment methods the store has switched on in Settings -> Payment.
// `minOrder` is only set for cash on delivery, which has a minimum order amount.
function toPaymentMethods(settings) {
  if (!settings) return [];
  const methods = [];
  if (settings.stripeEnabled) methods.push({ id: "card", label: "Credit or debit card", detail: "Pay with a credit or debit card." });
  if (settings.paypalEnabled) methods.push({ id: "paypal", label: "PayPal", detail: "Pay with your PayPal account." });
  if (settings.razorpayEnabled) methods.push({ id: "razorpay", label: "Razorpay", detail: "Pay online with Razorpay." });
  if (settings.codEnabled) {
    methods.push({
      id: "cod",
      label: "Cash on delivery",
      detail: "Pay when your order is delivered.",
      minOrder: Number(settings.codMinOrder) || 0,
    });
  }
  return methods;
}

export async function loadCheckoutSettings() {
  const [tax, payment] = await Promise.all([
    readOrNull("tax", getCurrencyTaxSettings),
    readOrNull("payment", getPaymentSettings),
  ]);
  return { tax: toTax(tax), paymentMethods: toPaymentMethods(payment) };
}
