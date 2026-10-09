import { sql } from "./db";
import { AccountError, cleanText } from "./accountError";
import { toPublicCustomer, setCustomerTwoFactor } from "./customers";
import { getSecuritySettings } from "./securitySettings";
import { hashPassword, verifyPassword } from "./auth/password";
import { createRateLimiter } from "./rateLimit";
import { isValidPassword, isValidEmail } from "@/components/auth/helpers";
import { formatUsPhone, isValidUsPhone } from "./phone";

// Server side of the account's Profile & security page. Anything that proves
// identity again (changing the email or password, deleting the account)
// re-checks the current password, and those checks share one attempt limit per
// customer so a hijacked session can't be used to guess it.

// Per server instance, like the other limiters in the app: a speed bump, not a hard cap.
const allowPasswordAttempt = createRateLimiter({ limit: 8, windowMs: 15 * 60 * 1000 });

async function getCustomerRow(id) {
  const [row] = await sql`SELECT * FROM customers WHERE id = ${id} AND is_guest = false`;
  if (!row) throw new AccountError("Your account could not be found. Please sign in again.", 401);
  return row;
}

// Counts the attempt, then compares. A wrong password and a rate-limited one
// are reported differently so the customer knows to wait rather than retype.
async function assertCurrentPassword(row, password) {
  if (!allowPasswordAttempt(row.id)) {
    throw new AccountError("Too many attempts. Please wait a few minutes and try again.", 429, "currentPassword");
  }
  if (!password || !(await verifyPassword(String(password), row.password_hash))) {
    throw new AccountError("That password isn't correct.", 400, "currentPassword");
  }
}

// Name, phone and marketing consent: the details that need no re-authentication.
export async function updateCustomerProfile(id, body) {
  const input = body && typeof body === "object" ? body : {};

  const firstName = cleanText(input.firstName, 100);
  const lastName = cleanText(input.lastName, 100);
  if (!firstName) throw new AccountError("Enter your first name.", 400, "firstName");
  if (!lastName) throw new AccountError("Enter your last name.", 400, "lastName");

  const phoneDigits = String(input.phone ?? "").replace(/\D/g, "");
  if (!isValidUsPhone(phoneDigits)) throw new AccountError("Enter a 10-digit phone number, or leave it blank.", 400, "phone");
  const phone = phoneDigits ? formatUsPhone(phoneDigits) : null;

  const [row] = await sql`
    UPDATE customers SET
      first_name = ${firstName}, last_name = ${lastName}, phone = ${phone},
      accepts_marketing = ${input.acceptsMarketing === true}, updated_at = now()
    WHERE id = ${id} AND is_guest = false
    RETURNING *
  `;
  if (!row) throw new AccountError("Your account could not be found. Please sign in again.", 401);
  return toPublicCustomer(row);
}

export async function changeCustomerEmail(id, body) {
  const input = body && typeof body === "object" ? body : {};
  const email = String(input.email ?? "").trim().toLowerCase();
  if (!email || email.length > 255 || !isValidEmail(email)) {
    throw new AccountError("Enter a valid email address, like name@example.com.", 400, "email");
  }

  const row = await getCustomerRow(id);
  if (row.email === email) throw new AccountError("That is already your email address.", 400, "email");
  await assertCurrentPassword(row, input.currentPassword);

  try {
    const [updated] = await sql`UPDATE customers SET email = ${email}, updated_at = now() WHERE id = ${id} RETURNING *`;
    return toPublicCustomer(updated);
  } catch (error) {
    if (error.code === "23505") throw new AccountError("An account with that email address already exists.", 409, "email");
    throw error;
  }
}

export async function changeCustomerPassword(id, body) {
  const input = body && typeof body === "object" ? body : {};
  const newPassword = String(input.newPassword ?? "");
  if (!isValidPassword(newPassword)) {
    throw new AccountError("Your new password must be at least 8 characters with a letter, a number and a special character.", 400, "newPassword");
  }

  const row = await getCustomerRow(id);
  await assertCurrentPassword(row, input.currentPassword);
  if (await verifyPassword(newPassword, row.password_hash)) {
    throw new AccountError("Choose a password you haven't used here before.", 400, "newPassword");
  }

  await sql`UPDATE customers SET password_hash = ${await hashPassword(newPassword)}, updated_at = now() WHERE id = ${id}`;
}

// Turns the emailed sign-in code on or off for this customer. Both directions
// re-check the current password, so a hijacked session can't quietly switch off
// the protection. When the store requires a code from everyone, it can't be
// turned off here.
export async function changeCustomerTwoFactor(id, body) {
  const input = body && typeof body === "object" ? body : {};
  if (typeof input.enabled !== "boolean") throw new AccountError("Choose whether to turn two-factor authentication on or off.", 400);

  const row = await getCustomerRow(id);
  if (!input.enabled) {
    const settings = await getSecuritySettings().catch(() => null);
    if (settings?.requireCustomerTwoFactor) {
      throw new AccountError("This store requires a sign-in code for every customer, so it can't be turned off.", 403);
    }
  }
  await assertCurrentPassword(row, input.currentPassword);

  return setCustomerTwoFactor(id, input.enabled);
}

// Permanent. Orders stay (they keep the name they were placed under) but lose
// the link to the account; the wishlist, addresses and saved cards go with it.
// An order still in progress blocks deletion: the store needs to reach someone about it.
export async function deleteCustomerAccount(id, body) {
  const input = body && typeof body === "object" ? body : {};
  const row = await getCustomerRow(id);
  await assertCurrentPassword(row, input.currentPassword);

  const [open] = await sql`
    SELECT 1 AS ok FROM orders WHERE customer_id = ${id} AND status IN ('Pending', 'Processing') LIMIT 1
  `;
  if (open) {
    throw new AccountError(
      "You have an order that isn't finished yet. You can delete your account once it is completed or cancelled.",
      409
    );
  }

  await sql`DELETE FROM customers WHERE id = ${id}`;
}
