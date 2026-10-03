import { sql } from "./db";

function toPublicSettings(row) {
  return {
    stripeEnabled: row.stripe_enabled,
    paypalEnabled: row.paypal_enabled,
    razorpayEnabled: row.razorpay_enabled,
    codEnabled: row.cod_enabled,
    stripePublishableKey: row.stripe_publishable_key || "",
    stripeSecretKey: row.stripe_secret_key || "",
    paypalClientId: row.paypal_client_id || "",
    paypalClientSecret: row.paypal_client_secret || "",
    paypalEnvironment: row.paypal_environment || "sandbox",
    razorpayKeyId: row.razorpay_key_id || "",
    razorpayKeySecret: row.razorpay_key_secret || "",
    transactionFee: String(row.transaction_fee),
    codMinOrder: String(row.cod_min_order),
    autoCapture: row.auto_capture,
  };
}

export async function getPaymentSettings() {
  const [row] = await sql`SELECT * FROM payment_settings WHERE id = 1`;
  return toPublicSettings(row);
}

export async function updatePaymentSettings(settings) {
  const [row] = await sql`
    UPDATE payment_settings SET
      stripe_enabled = ${settings.stripeEnabled},
      paypal_enabled = ${settings.paypalEnabled},
      razorpay_enabled = ${settings.razorpayEnabled},
      cod_enabled = ${settings.codEnabled},
      stripe_publishable_key = ${settings.stripePublishableKey || null},
      stripe_secret_key = ${settings.stripeSecretKey || null},
      paypal_client_id = ${settings.paypalClientId || null},
      paypal_client_secret = ${settings.paypalClientSecret || null},
      paypal_environment = ${settings.paypalEnvironment},
      razorpay_key_id = ${settings.razorpayKeyId || null},
      razorpay_key_secret = ${settings.razorpayKeySecret || null},
      transaction_fee = ${settings.transactionFee},
      cod_min_order = ${settings.codMinOrder},
      auto_capture = ${settings.autoCapture},
      updated_at = now()
    WHERE id = 1
    RETURNING *
  `;
  return toPublicSettings(row);
}
