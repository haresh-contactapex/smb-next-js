import { sql } from "./db";

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

export async function createCustomer({ firstName, lastName, email, passwordHash, acceptsMarketing, agreedToTerms }) {
  const termsAcceptedAt = agreedToTerms ? new Date() : null;
  const [created] = await sql`
    INSERT INTO customers (
      first_name, last_name, email, password_hash, accepts_marketing, terms_accepted_at
    ) VALUES (
      ${firstName.trim()}, ${lastName.trim()}, ${email.trim().toLowerCase()}, ${passwordHash},
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
