import { sql } from "./db";

function toPublicSettings(row) {
  return {
    orderNumberPrefix: row.order_number_prefix || "",
    startingOrderNumber: row.starting_order_number,
    autoCancelHours: row.auto_cancel_hours,
    defaultOrderStatus: row.default_order_status,
    requireConfirmationEmail: row.require_confirmation_email,
    allowOrderEdits: row.allow_order_edits,
  };
}

export async function getOrdersSettings() {
  const [row] = await sql`SELECT * FROM orders_settings WHERE id = 1`;
  return toPublicSettings(row);
}

export async function updateOrdersSettings(settings) {
  const [row] = await sql`
    UPDATE orders_settings SET
      order_number_prefix = ${settings.orderNumberPrefix || null},
      starting_order_number = ${settings.startingOrderNumber},
      auto_cancel_hours = ${settings.autoCancelHours},
      default_order_status = ${settings.defaultOrderStatus},
      require_confirmation_email = ${settings.requireConfirmationEmail},
      allow_order_edits = ${settings.allowOrderEdits},
      updated_at = now()
    WHERE id = 1
    RETURNING *
  `;
  return toPublicSettings(row);
}
