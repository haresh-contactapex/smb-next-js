import { sql, sqlTransaction } from "./db";
import { AccountError, cleanText, isUuid } from "./accountError";
import { LOCATIONS } from "@/data/locationData";
import { validateTypedLocation } from "./validateAddress";
import { formatUsPhone, isValidUsPhone } from "./phone";
import { MAX_ADDRESSES } from "./accountLimits";

// Server side of the account address book (/account/addresses). Every query is
// scoped by customer_id, so one customer can never read or change another's
// rows by guessing an id. The location is validated here as well as in the
// browser: the browser's check is a convenience, not a guarantee.

export { MAX_ADDRESSES };

function toAddress(row) {
  return {
    id: row.id,
    label: row.label,
    fullName: row.full_name,
    company: row.company || "",
    phone: row.phone || "",
    line1: row.address_line1,
    line2: row.address_line2 || "",
    city: row.city,
    state: row.state,
    zip: row.postal_code || "",
    country: row.country,
    instructions: row.delivery_instructions || "",
    isDefaultShipping: row.is_default_shipping,
    isDefaultBilling: row.is_default_billing,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

// Validates a request body into the values to store. Throws an AccountError
// naming the first field at fault (field names match the form's inputs).
export function parseAddressInput(body) {
  const input = body && typeof body === "object" ? body : {};

  const label = cleanText(input.label, 40) || "Home";
  const fullName = cleanText(input.fullName, 150);
  if (!fullName) throw new AccountError("Enter the recipient's full name.", 400, "fullName");

  const company = cleanText(input.company, 150);

  const phoneDigits = String(input.phone ?? "").replace(/\D/g, "");
  if (!isValidUsPhone(phoneDigits)) throw new AccountError("Enter a 10-digit phone number, or leave it blank.", 400, "phone");
  const phone = phoneDigits ? formatUsPhone(phoneDigits) : "";

  const line1 = cleanText(input.line1, 120);
  if (!line1) throw new AccountError("Enter the street address.", 400, "line1");
  const line2 = cleanText(input.line2, 120);

  const country = cleanText(input.country, 100);
  const zip = cleanText(input.zip, 12);
  if (!LOCATIONS[country]) throw new AccountError("Select a country.", 400, "country");
  if (!cleanText(input.state, 100)) throw new AccountError("Enter the state or province.", 400, "state");
  if (!cleanText(input.city, 100)) throw new AccountError("Enter the city.", 400, "city");

  // Country -> state -> city -> postal code must agree; the valid result carries
  // the state and city spelled the way the location data has them.
  const location = validateTypedLocation({ country, state: input.state, city: input.city, postalCode: zip });
  if (!location.valid) throw new AccountError(location.message, 400, location.field);

  return {
    label,
    fullName,
    company,
    phone,
    line1,
    line2,
    city: location.city,
    state: location.state,
    zip,
    country,
    instructions: cleanText(input.instructions, 500),
    makeDefaultShipping: input.makeDefaultShipping === true,
    makeDefaultBilling: input.makeDefaultBilling === true,
  };
}

// Default shipping address first, then default billing, then newest.
export async function listCustomerAddresses(customerId) {
  const rows = await sql`
    SELECT * FROM customer_addresses
    WHERE customer_id = ${customerId}
    ORDER BY is_default_shipping DESC, is_default_billing DESC, created_at DESC, id
  `;
  return rows.map(toAddress);
}

export async function getCustomerAddress(customerId, id) {
  if (!isUuid(id)) return null;
  const [row] = await sql`SELECT * FROM customer_addresses WHERE id = ${id} AND customer_id = ${customerId}`;
  return row ? toAddress(row) : null;
}

// The first address a customer saves becomes both defaults, so checkout always
// has something to preselect. Returns the full updated list.
export async function createCustomerAddress(customerId, body) {
  const v = parseAddressInput(body);
  let inserted;
  try {
    inserted = await sql`
      INSERT INTO customer_addresses (
        customer_id, label, full_name, company, phone, address_line1, address_line2,
        city, state, postal_code, country, delivery_instructions,
        is_default_shipping, is_default_billing
      )
      SELECT
        ${customerId}::uuid, ${v.label}, ${v.fullName}, ${v.company || null}, ${v.phone || null}, ${v.line1}, ${v.line2 || null},
        ${v.city}, ${v.state}, ${v.zip || null}, ${v.country}, ${v.instructions || null},
        NOT EXISTS (SELECT 1 FROM customer_addresses WHERE customer_id = ${customerId} AND is_default_shipping),
        NOT EXISTS (SELECT 1 FROM customer_addresses WHERE customer_id = ${customerId} AND is_default_billing)
      WHERE (SELECT COUNT(*) FROM customer_addresses WHERE customer_id = ${customerId}) < ${MAX_ADDRESSES}
      RETURNING id
    `;
  } catch (error) {
    // Two first addresses saved at the same moment both claimed the default.
    if (error.code === "23505") throw new AccountError("Your address book changed while saving. Please try again.", 409);
    throw error;
  }
  if (inserted.length === 0) {
    throw new AccountError(`You can save up to ${MAX_ADDRESSES} addresses. Delete one to add another.`, 409);
  }

  const id = inserted[0].id;
  if (v.makeDefaultShipping) await setDefaultAddress(customerId, id, "shipping");
  if (v.makeDefaultBilling) await setDefaultAddress(customerId, id, "billing");
  return listCustomerAddresses(customerId);
}

export async function updateCustomerAddress(customerId, id, body) {
  if (!isUuid(id)) throw new AccountError("That address no longer exists.", 404);
  const v = parseAddressInput(body);
  const updated = await sql`
    UPDATE customer_addresses SET
      label = ${v.label}, full_name = ${v.fullName}, company = ${v.company || null}, phone = ${v.phone || null},
      address_line1 = ${v.line1}, address_line2 = ${v.line2 || null}, city = ${v.city}, state = ${v.state},
      postal_code = ${v.zip || null}, country = ${v.country}, delivery_instructions = ${v.instructions || null},
      updated_at = now()
    WHERE id = ${id} AND customer_id = ${customerId}
    RETURNING id
  `;
  if (updated.length === 0) throw new AccountError("That address no longer exists.", 404);

  if (v.makeDefaultShipping) await setDefaultAddress(customerId, id, "shipping");
  if (v.makeDefaultBilling) await setDefaultAddress(customerId, id, "billing");
  return listCustomerAddresses(customerId);
}

// Deleting a default hands that role to the most recently updated address left,
// so a customer with addresses always has a default of each kind.
export async function deleteCustomerAddress(customerId, id) {
  if (!isUuid(id)) throw new AccountError("That address no longer exists.", 404);
  const [removed] = await sqlTransaction((tx) => [
    tx`DELETE FROM customer_addresses WHERE id = ${id} AND customer_id = ${customerId} RETURNING id`,
    tx`
      UPDATE customer_addresses SET is_default_shipping = true
      WHERE id = (SELECT id FROM customer_addresses WHERE customer_id = ${customerId} ORDER BY updated_at DESC, id LIMIT 1)
        AND NOT EXISTS (SELECT 1 FROM customer_addresses WHERE customer_id = ${customerId} AND is_default_shipping)
    `,
    tx`
      UPDATE customer_addresses SET is_default_billing = true
      WHERE id = (SELECT id FROM customer_addresses WHERE customer_id = ${customerId} ORDER BY updated_at DESC, id LIMIT 1)
        AND NOT EXISTS (SELECT 1 FROM customer_addresses WHERE customer_id = ${customerId} AND is_default_billing)
    `,
  ]);
  if (removed.length === 0) throw new AccountError("That address no longer exists.", 404);
  return listCustomerAddresses(customerId);
}

// kind: "shipping" | "billing". The old default is cleared first (in the same
// transaction) because the unique index allows only one of each per customer.
// The clear is skipped when the target isn't this customer's, so a bad id can't
// leave them without a default.
export async function setDefaultAddress(customerId, id, kind) {
  if (!isUuid(id)) throw new AccountError("That address no longer exists.", 404);
  if (kind !== "shipping" && kind !== "billing") throw new AccountError("Choose shipping or billing.", 400);

  const [, set] =
    kind === "shipping"
      ? await sqlTransaction((tx) => [
          tx`
            UPDATE customer_addresses SET is_default_shipping = false
            WHERE customer_id = ${customerId} AND is_default_shipping AND id <> ${id}
              AND EXISTS (SELECT 1 FROM customer_addresses WHERE id = ${id} AND customer_id = ${customerId})
          `,
          tx`UPDATE customer_addresses SET is_default_shipping = true, updated_at = now() WHERE id = ${id} AND customer_id = ${customerId} RETURNING id`,
        ])
      : await sqlTransaction((tx) => [
          tx`
            UPDATE customer_addresses SET is_default_billing = false
            WHERE customer_id = ${customerId} AND is_default_billing AND id <> ${id}
              AND EXISTS (SELECT 1 FROM customer_addresses WHERE id = ${id} AND customer_id = ${customerId})
          `,
          tx`UPDATE customer_addresses SET is_default_billing = true, updated_at = now() WHERE id = ${id} AND customer_id = ${customerId} RETURNING id`,
        ]);
  if (set.length === 0) throw new AccountError("That address no longer exists.", 404);
  return listCustomerAddresses(customerId);
}
