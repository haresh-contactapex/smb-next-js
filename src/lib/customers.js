import { sql } from "./db";
import { isValidUsPhone } from "./phone";

// Never include password_hash in anything handed back to a route handler's
// JSON response or a JWT payload.
function toPublicCustomer(row) {
  if (!row) return null;
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone || null,
    customerGroup: row.customer_group,
    loyaltyPoints: Number(row.loyalty_points) || 0,
    acceptsMarketing: row.accepts_marketing,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
  };
}

export async function findCustomerByEmail(email) {
  const [row] = await sql`
    SELECT * FROM customers WHERE email = ${email.trim().toLowerCase()} AND is_guest = false
  `;
  return row || null;
}

export async function getCustomerById(id) {
  const [row] = await sql`SELECT * FROM customers WHERE id = ${id} AND is_guest = false`;
  return toPublicCustomer(row);
}

// Email is unique across every customer row (guest or registered), compared
// case-insensitively. Returns who holds it ({ id, isGuest }) or null.
export async function findCustomerEmailOwner(email) {
  const [row] = await sql`
    SELECT id, is_guest FROM customers
    WHERE lower(email) = ${String(email).trim().toLowerCase()}
    ORDER BY is_guest, created_at
    LIMIT 1
  `;
  return row ? { id: row.id, isGuest: row.is_guest } : null;
}

export async function createCustomer({ firstName, lastName, email, phone, passwordHash, acceptsMarketing, agreedToTerms }) {
  const termsAcceptedAt = agreedToTerms ? new Date() : null;

  // A guest checkout leaves a customer row behind. Registering with the same
  // email turns that row into the account instead of adding a second one. Registration
  // doesn't verify the email, so the guest's past orders are unlinked first: the
  // new account must not inherit orders (and addresses) placed by whoever used the email.
  const [guest] = await sql`
    SELECT id FROM customers
    WHERE lower(email) = ${email.trim().toLowerCase()} AND is_guest = true
    ORDER BY created_at
    LIMIT 1
  `;
  if (guest) {
    await sql`UPDATE orders SET customer_id = NULL WHERE customer_id = ${guest.id}`;
    const [claimed] = await sql`
      UPDATE customers SET
        first_name = ${firstName.trim()}, last_name = ${lastName.trim()}, email = ${email.trim().toLowerCase()},
        phone = ${phone || null}, password_hash = ${passwordHash}, accepts_marketing = ${acceptsMarketing ?? false},
        terms_accepted_at = ${termsAcceptedAt}, is_guest = false, updated_at = now()
      WHERE id = ${guest.id}
      RETURNING *
    `;
    return toPublicCustomer(claimed);
  }

  const [created] = await sql`
    INSERT INTO customers (
      first_name, last_name, email, phone, password_hash, accepts_marketing, terms_accepted_at
    ) VALUES (
      ${firstName.trim()}, ${lastName.trim()}, ${email.trim().toLowerCase()}, ${phone || null}, ${passwordHash},
      ${acceptsMarketing ?? false}, ${termsAcceptedAt}
    )
    RETURNING *
  `;
  return toPublicCustomer(created);
}

export async function updateCustomerPassword(id, passwordHash) {
  await sql`UPDATE customers SET password_hash = ${passwordHash}, updated_at = now() WHERE id = ${id}`;
}

export { toPublicCustomer };

// Admin-facing customer records CRUD (Customers nav tab). Distinct from the
// functions above, which back the customer-facing register/login/session
// flow and intentionally use a narrower, auth-only shape.
function mapCustomerRecord(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone || null,
    customerGroup: row.customer_group,
    loyaltyPoints: Number(row.loyalty_points) || 0,
    acceptsMarketing: row.accepts_marketing,
    isGuest: row.is_guest,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCustomers() {
  const rows = await sql`
    SELECT id, first_name, last_name, email, phone, customer_group, loyalty_points,
           accepts_marketing, is_guest, created_at, updated_at
    FROM customers
    ORDER BY created_at DESC
  `;
  return rows.map(mapCustomerRecord);
}

export async function getCustomerRecordById(id) {
  const [row] = await sql`
    SELECT id, first_name, last_name, email, phone, customer_group, loyalty_points,
           accepts_marketing, is_guest, created_at, updated_at
    FROM customers
    WHERE id = ${id}
  `;
  return row ? mapCustomerRecord(row) : null;
}

const CUSTOMER_GROUPS = ["Retail", "Wholesale", "VIP"];

function customerRecordValues(payload) {
  const firstName = String(payload.firstName || "").trim();
  const lastName = String(payload.lastName || "").trim();
  const email = String(payload.email || "").trim().toLowerCase();
  const phone = String(payload.phone || "").trim() || null;
  const customerGroup = CUSTOMER_GROUPS.includes(payload.customerGroup) ? payload.customerGroup : "Retail";
  const loyaltyPoints = Math.max(0, parseInt(payload.loyaltyPoints, 10) || 0);
  const acceptsMarketing = Boolean(payload.acceptsMarketing);

  if (!firstName || !lastName) throw new Error("First name and last name are required.");
  if (!email) throw new Error("Email is required.");
  if (!isValidUsPhone(phone)) throw new Error("Enter a valid 10-digit US phone number.");

  return { firstName, lastName, email, phone, customerGroup, loyaltyPoints, acceptsMarketing };
}

// Checked in code as well as by the unique index so the error is clear and a
// guest row's email is covered even before the index has been upgraded.
async function assertEmailAvailable(email, excludeId = null) {
  const rows = excludeId
    ? await sql`SELECT id FROM customers WHERE lower(email) = ${email} AND id <> ${excludeId} LIMIT 1`
    : await sql`SELECT id FROM customers WHERE lower(email) = ${email} LIMIT 1`;
  if (rows.length) throw new Error(`A customer with the email "${email}" already exists.`);
}

export async function createCustomerRecord(payload) {
  const v = customerRecordValues(payload);
  await assertEmailAvailable(v.email);
  try {
    const [created] = await sql`
      INSERT INTO customers (
        first_name, last_name, email, phone, customer_group, loyalty_points, accepts_marketing
      ) VALUES (
        ${v.firstName}, ${v.lastName}, ${v.email}, ${v.phone}, ${v.customerGroup}, ${v.loyaltyPoints}, ${v.acceptsMarketing}
      )
      RETURNING id
    `;
    return created.id;
  } catch (error) {
    if (error.code === "23505") {
      throw new Error(`A customer with the email "${v.email}" already exists.`);
    }
    throw error;
  }
}

export async function updateCustomerRecord(id, payload) {
  const v = customerRecordValues(payload);
  await assertEmailAvailable(v.email, id);
  try {
    await sql`
      UPDATE customers SET
        first_name = ${v.firstName}, last_name = ${v.lastName}, email = ${v.email}, phone = ${v.phone},
        customer_group = ${v.customerGroup}, loyalty_points = ${v.loyaltyPoints}, accepts_marketing = ${v.acceptsMarketing},
        updated_at = now()
      WHERE id = ${id}
    `;
    return id;
  } catch (error) {
    if (error.code === "23505") {
      throw new Error(`A customer with the email "${v.email}" already exists.`);
    }
    throw error;
  }
}

export async function deleteCustomerRecord(id) {
  await sql`DELETE FROM customers WHERE id = ${id}`;
}

export async function deleteCustomerRecords(ids) {
  const rows = await sql`DELETE FROM customers WHERE id = ANY(${ids}::uuid[]) RETURNING id`;
  return rows.length;
}
