import { sql } from "./db";

function toPublicAddress(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    fullName: row.full_name,
    company: row.company || "",
    addressLine1: row.address_line1,
    addressLine2: row.address_line2 || "",
    city: row.city,
    state: row.state || "",
    zip: row.postal_code || "",
    country: row.country,
    phone: row.phone || "",
    sameAsBilling: row.same_as_billing,
    deliveryInstructions: row.delivery_instructions || "",
  };
}

export async function getAddressesByUserId(userId) {
  const rows = await sql`SELECT * FROM addresses WHERE user_id = ${userId}`;
  const byType = { billing: null, shipping: null };
  for (const row of rows) {
    byType[row.type === "BILLING" ? "billing" : "shipping"] = toPublicAddress(row);
  }
  return byType;
}

export async function upsertAddress(userId, type, address) {
  const dbType = type.toUpperCase();
  const [row] = await sql`
    INSERT INTO addresses (
      user_id, type, full_name, company, address_line1, address_line2,
      city, state, postal_code, country, phone, same_as_billing, delivery_instructions
    )
    VALUES (
      ${userId}, ${dbType}, ${address.fullName}, ${address.company || null},
      ${address.addressLine1}, ${address.addressLine2 || null}, ${address.city},
      ${address.state || null}, ${address.zip || null}, ${address.country},
      ${address.phone || null}, ${address.sameAsBilling ?? false}, ${address.deliveryInstructions || null}
    )
    ON CONFLICT (user_id, type) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      company = EXCLUDED.company,
      address_line1 = EXCLUDED.address_line1,
      address_line2 = EXCLUDED.address_line2,
      city = EXCLUDED.city,
      state = EXCLUDED.state,
      postal_code = EXCLUDED.postal_code,
      country = EXCLUDED.country,
      phone = EXCLUDED.phone,
      same_as_billing = EXCLUDED.same_as_billing,
      delivery_instructions = EXCLUDED.delivery_instructions,
      updated_at = now()
    RETURNING *
  `;
  return toPublicAddress(row);
}

export async function deleteAddress(userId, type) {
  const dbType = type.toUpperCase();
  await sql`DELETE FROM addresses WHERE user_id = ${userId} AND type = ${dbType}`;
}
