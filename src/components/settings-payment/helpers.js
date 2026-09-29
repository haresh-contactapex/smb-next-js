export const DEFAULT_PAYMENT_SETTINGS = {
  stripeEnabled: true,
  paypalEnabled: false,
  razorpayEnabled: false,
  codEnabled: true,
  publicKey: "",
  secretKey: "",
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
  return {
    stripeEnabled: Boolean(data.stripeEnabled),
    paypalEnabled: Boolean(data.paypalEnabled),
    razorpayEnabled: Boolean(data.razorpayEnabled),
    codEnabled: Boolean(data.codEnabled),
    publicKey: data.publicKey || "",
    secretKey: data.secretKey || "",
    transactionFee: data.transactionFee != null ? String(data.transactionFee) : "2.9",
    codMinOrder: data.codMinOrder != null ? String(data.codMinOrder) : "0",
    autoCapture: Boolean(data.autoCapture),
  };
}

export function toSavePayload(settings) {
  return { ...settings };
}

// Order the "focus the first bad field" behavior follows.
export const PAYMENT_FIELD_ORDER = ["transactionFee", "codMinOrder"];

export function validatePaymentSettingsForm(settings) {
  const errors = {};
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
