import { sql } from "./db";
import { isMissingRelation } from "./accountError";

function toPublicSettings(row) {
  return {
    allowGuestCheckout: row.allow_guest_checkout,
    requirePhone: row.require_phone,
    requireTerms: row.require_terms,
    minimumOrderAmount: Number(row.minimum_order_amount),
    sendAbandonedCartEmails: row.send_abandoned_cart_emails,
    reminderDelayHours: row.reminder_delay_hours,
  };
}

export async function getCheckoutSettings() {
  const [row] = await sql`SELECT * FROM checkout_settings WHERE id = 1`;
  return toPublicSettings(row);
}

export async function updateCheckoutSettings(settings) {
  const [row] = await sql`
    UPDATE checkout_settings SET
      allow_guest_checkout = ${settings.allowGuestCheckout},
      require_phone = ${settings.requirePhone},
      require_terms = ${settings.requireTerms},
      minimum_order_amount = ${settings.minimumOrderAmount},
      send_abandoned_cart_emails = ${settings.sendAbandonedCartEmails},
      reminder_delay_hours = ${settings.reminderDelayHours},
      updated_at = now()
    WHERE id = 1
    RETURNING *
  `;
  return toPublicSettings(row);
}

// Whether a visitor may check out without an account (Settings -> Checkout ->
// Allow guest checkout). A store that hasn't run the checkout migration yet, or
// whose settings row is missing, keeps today's behavior: guests are allowed.
// Any other failure propagates so an order is never decided on a guess.
export async function isGuestCheckoutAllowed() {
  try {
    const [row] = await sql`SELECT allow_guest_checkout FROM checkout_settings WHERE id = 1`;
    return row ? Boolean(row.allow_guest_checkout) : true;
  } catch (error) {
    if (isMissingRelation(error)) return true;
    throw error;
  }
}
