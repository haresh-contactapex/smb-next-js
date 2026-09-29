import { sql } from "./db";

function toPublicSettings(row) {
  return {
    stripeEnabled: row.stripe_enabled,
    paypalEnabled: row.paypal_enabled,
    razorpayEnabled: row.razorpay_enabled,
    codEnabled: row.cod_enabled,
    publicKey: row.public_key || "",
    secretKey: row.secret_key || "",
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
      public_key = ${settings.publicKey || null},
      secret_key = ${settings.secretKey || null},
      transaction_fee = ${settings.transactionFee},
      cod_min_order = ${settings.codMinOrder},
      auto_capture = ${settings.autoCapture},
      updated_at = now()
    WHERE id = 1
    RETURNING *
  `;
  return toPublicSettings(row);
}
