import { getCurrencyTaxSettings } from "./currencyTaxSettings";
import { getPaymentSettings } from "./paymentSettings";
import { loadStripeConfig, toStripePublicConfig } from "./stripe";
import { getCurrentCustomer } from "./auth/customerSession";
import { listCustomerAddresses } from "./customerAddresses";

// Server side of the storefront checkout page. The cart itself lives in the
// visitor's browser (see storefrontCart.js); this reads the two store settings
// the page needs and hands over the public parts, plus, for a signed-in
// customer, their own details and saved addresses. Gateway keys in the payment
// settings never leave the server.

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
// The card method carries the Stripe publishable key and mode (never the secret key),
// or `unavailable` when Stripe is switched on but its keys are missing or don't match.
function toPaymentMethods(settings, stripe) {
  if (!settings) return [];
  const methods = [];
  if (settings.stripeEnabled) {
    const ready = Boolean(stripe?.configured);
    if (!ready) console.warn(`Checkout: card payments are unavailable. ${stripe?.problem || "Stripe settings could not be read."}`);
    methods.push({
      id: "card",
      label: "Credit or debit card",
      detail: "Pay with a credit or debit card.",
      stripe: ready ? toStripePublicConfig(stripe) : null,
      unavailable: ready ? null : "Card payments aren't available right now.",
    });
  }
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
  const [tax, payment, stripe] = await Promise.all([
    readOrNull("tax", getCurrencyTaxSettings),
    readOrNull("payment", getPaymentSettings),
    readOrNull("stripe", loadStripeConfig),
  ]);
  return { tax: toTax(tax), paymentMethods: toPaymentMethods(payment, stripe) };
}

// The currency and tax rules an order is priced with. Unlike the page's own extras
// above this throws when it can't be read: an order must never be priced without them.
export async function loadCheckoutPricingSettings() {
  const settings = await getCurrencyTaxSettings();
  return {
    currency: settings.currency || "USD",
    moneyFormat: { position: settings.currencyPosition, numberFormat: settings.numberFormat },
    tax: toTax(settings),
  };
}

// The signed-in customer's own details and address book, to prefill the checkout
// with, or null for a guest. Like the settings above this is an extra: if the
// session or the database can't be read the checkout is simply the guest one.
// Only what the checkout fills in is handed over (no phone or delivery notes
// from the address book, no loyalty data).
export async function loadCheckoutAccount() {
  try {
    const customer = await getCurrentCustomer();
    if (!customer) return null;

    const addresses = (await readOrNull("saved addresses", () => listCustomerAddresses(customer.id))) || [];
    return {
      customer: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone || "",
      },
      addresses: addresses.map((address) => ({
        id: address.id,
        label: address.label,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        zip: address.zip,
        country: address.country,
        isDefaultShipping: address.isDefaultShipping,
        isDefaultBilling: address.isDefaultBilling,
      })),
    };
  } catch (error) {
    console.error("Checkout account failed to load", error);
    return null;
  }
}
