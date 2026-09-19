import { sql } from "./db";

export async function insertCustomerResetToken({ customerId, tokenHash, requestedEmail, expiresAt }) {
  await sql`
    INSERT INTO password_reset_tokens (customer_id, token_hash, requested_email, expires_at)
    VALUES (${customerId}, ${tokenHash}, ${requestedEmail}, ${expiresAt})
  `;
}

// A token is valid only if it exists, isn't expired, and hasn't been used yet —
// "already used" and "expired" are different failure cases callers may want
// to distinguish, so both are returned rather than filtered out here.
export async function findCustomerResetToken(tokenHash) {
  const [row] = await sql`
    SELECT * FROM password_reset_tokens WHERE token_hash = ${tokenHash}
  `;
  return row || null;
}

export async function markCustomerResetTokenUsed(id) {
  await sql`UPDATE password_reset_tokens SET used_at = now() WHERE id = ${id}`;
}

export async function insertStaffResetToken({ userId, tokenHash, requestedEmail, expiresAt }) {
  await sql`
    INSERT INTO staff_password_reset_tokens (user_id, token_hash, requested_email, expires_at)
    VALUES (${userId}, ${tokenHash}, ${requestedEmail}, ${expiresAt})
  `;
}

export async function findStaffResetToken(tokenHash) {
  const [row] = await sql`
    SELECT * FROM staff_password_reset_tokens WHERE token_hash = ${tokenHash}
  `;
  return row || null;
}

export async function markStaffResetTokenUsed(id) {
  await sql`UPDATE staff_password_reset_tokens SET used_at = now() WHERE id = ${id}`;
}
