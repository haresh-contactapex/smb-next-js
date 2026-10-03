export const PAYPAL_ENVIRONMENTS = [
  { value: "sandbox", label: "Sandbox (testing)" },
  { value: "live", label: "Live" },
];

// The online gateways. The store can have at most one of them switched on at a
// time (Cash on Delivery is separate and may be on with or without one), and
// each keeps its own credentials. A field with `options` is a select; a field
// with `secret` is masked.
export const PAYMENT_GATEWAYS = [
  {
    id: "stripe",
    label: "Stripe",
    enabledKey: "stripeEnabled",
    help: "Find your API keys in the Stripe Dashboard under Developers → API keys.",
    fields: [
      { key: "stripePublishableKey", id: "f-stripe-publishable-key", label: "Publishable key", placeholder: "pk_live_..." },
      { key: "stripeSecretKey", id: "f-stripe-secret-key", label: "Secret key", placeholder: "sk_live_...", secret: true },
    ],
  },
  {
    id: "paypal",
    label: "PayPal",
    enabledKey: "paypalEnabled",
    help: "Create a REST API app in the PayPal Developer Dashboard (Apps & Credentials) to get a client ID and secret.",
    fields: [
      { key: "paypalClientId", id: "f-paypal-client-id", label: "Client ID" },
      { key: "paypalClientSecret", id: "f-paypal-client-secret", label: "Client secret", secret: true },
      { key: "paypalEnvironment", id: "f-paypal-environment", label: "Environment", options: PAYPAL_ENVIRONMENTS },
    ],
  },
  {
    id: "razorpay",
    label: "Razorpay",
    enabledKey: "razorpayEnabled",
    help: "Generate your API keys in the Razorpay Dashboard under Account & Settings → API keys.",
    fields: [
      { key: "razorpayKeyId", id: "f-razorpay-key-id", label: "Key ID", placeholder: "rzp_live_..." },
      { key: "razorpayKeySecret", id: "f-razorpay-key-secret", label: "Key secret", secret: true },
    ],
  },
];

// Every free-text credential field across the gateways (the selects are
// validated separately).
export const GATEWAY_CREDENTIAL_KEYS = PAYMENT_GATEWAYS.flatMap((gateway) =>
  gateway.fields.filter((field) => !field.options).map((field) => field.key),
);

export const DEFAULT_PAYMENT_SETTINGS = {
  stripeEnabled: true,
  paypalEnabled: false,
  razorpayEnabled: false,
  codEnabled: true,
  stripePublishableKey: "",
  stripeSecretKey: "",
  paypalClientId: "",
  paypalClientSecret: "",
  paypalEnvironment: "sandbox",
  razorpayKeyId: "",
  razorpayKeySecret: "",
  transactionFee: "2.9",
  codMinOrder: "0",
  autoCapture: true,
};

// Matches DECIMAL(5,2): 0-100 with up to 2 decimal places.
export function isValidTransactionFee(value) {
  if (!/^\d+(\.\d{1,2})?$/.test(String(value).trim())) return false;
  const n = Number(value);
  return n >= 0 && n <= 100;
}

// Matches DECIMAL(12,2): a non-negative amount with up to 2 decimal places.
export function isValidMoneyAmount(value) {
  return /^\d+(\.\d{1,2})?$/.test(String(value).trim());
}

export function toFormSettings(data) {
  if (!data) return DEFAULT_PAYMENT_SETTINGS;
  const credentials = Object.fromEntries(GATEWAY_CREDENTIAL_KEYS.map((key) => [key, data[key] || ""]));
  return {
    stripeEnabled: Boolean(data.stripeEnabled),
    paypalEnabled: Boolean(data.paypalEnabled),
    razorpayEnabled: Boolean(data.razorpayEnabled),
    codEnabled: Boolean(data.codEnabled),
    ...credentials,
    paypalEnvironment: data.paypalEnvironment || "sandbox",
    transactionFee: data.transactionFee != null ? String(data.transactionFee) : "2.9",
    codMinOrder: data.codMinOrder != null ? String(data.codMinOrder) : "0",
    autoCapture: Boolean(data.autoCapture),
  };
}

export function toSavePayload(settings) {
  return { ...settings };
}

export function selectedGateways(settings) {
  return PAYMENT_GATEWAYS.filter((gateway) => settings[gateway.enabledKey]);
}

// One online gateway at a time: switching a gateway on switches any other off,
// and switching the selected one off leaves none selected. Cash on Delivery is
// not part of this and is toggled on its own. Credentials are never touched.
export function setGatewaySelected(settings, gatewayId, selected) {
  const next = { ...settings };
  for (const gateway of PAYMENT_GATEWAYS) {
    if (gateway.id === gatewayId) next[gateway.enabledKey] = selected;
    else if (selected) next[gateway.enabledKey] = false;
  }
  return next;
}

// Order the "focus the first bad field" behavior follows.
export const PAYMENT_FIELD_ORDER = ["gateways", "paypalEnvironment", "transactionFee", "codMinOrder"];

export function validatePaymentSettingsForm(settings) {
  const errors = {};

  const gateways = selectedGateways(settings);
  if (gateways.length > 1) {
    errors.gateways =
      "Select only one online payment gateway: Stripe, PayPal or Razorpay. Cash on Delivery can be selected alongside it.";
  } else if (gateways.length === 0 && !settings.codEnabled) {
    errors.gateways = "Select at least one payment method: Stripe, PayPal, Razorpay or Cash on Delivery.";
  }

  if (!PAYPAL_ENVIRONMENTS.some((environment) => environment.value === settings.paypalEnvironment)) {
    errors.paypalEnvironment = "Choose Sandbox or Live for PayPal.";
  }

  if (!String(settings.transactionFee).trim()) errors.transactionFee = "Transaction fee is required.";
  else if (!isValidTransactionFee(settings.transactionFee)) {
    errors.transactionFee = "Enter a fee between 0 and 100, with up to 2 decimal places.";
  }
  if (!String(settings.codMinOrder).trim()) errors.codMinOrder = "Minimum order for COD is required.";
  else if (!isValidMoneyAmount(settings.codMinOrder)) {
    errors.codMinOrder = "Enter an amount of 0 or more, with up to 2 decimal places.";
  }

  const firstErrorField = PAYMENT_FIELD_ORDER.find((f) => errors[f]);
  return {
    valid: !firstErrorField,
    errors,
    firstErrorField,
    message: firstErrorField ? errors[firstErrorField] : "",
  };
}
