import { randomInt } from "crypto";
import { sql } from "@/lib/db";
import { hashPassword, verifyPassword } from "./password";
import {
  LoginOtpError,
  OTP_LENGTH,
  OTP_TTL_MS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_RESEND_WINDOW_MS,
  OTP_RESEND_MAX_IN_WINDOW,
} from "./loginOtp";

/**
 * Customer sign-in 2FA: the same emailed 6-digit code, expiry, attempt cap and
 * resend limits as the staff flow (loginOtp.js, whose constants and error type
 * are reused), but stored in its own `customer_login_otps` table
 * (docs/auth/customer-two-factor-only.sql) so a customer code can never be
 * redeemed against a staff account or the other way round.
 */

function generateCode() {
  return String(randomInt(10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
}

// Returns null when a code may be sent now, or { retryAfterSeconds } when the
// caller must wait — either the cooldown since the last send, or the abuse
// cap for the resend window.
export async function checkCustomerOtpRateLimit(customerId) {
  const windowStart = new Date(Date.now() - OTP_RESEND_WINDOW_MS);
  const rows = await sql`
    SELECT created_at FROM customer_login_otps
    WHERE customer_id = ${customerId} AND created_at > ${windowStart}
    ORDER BY created_at DESC
  `;
  if (rows.length === 0) return null;

  const mostRecentAgeMs = Date.now() - new Date(rows[0].created_at).getTime();
  const cooldownRemainingMs = OTP_RESEND_COOLDOWN_MS - mostRecentAgeMs;
  if (cooldownRemainingMs > 0) {
    return { retryAfterSeconds: Math.ceil(cooldownRemainingMs / 1000) };
  }

  if (rows.length >= OTP_RESEND_MAX_IN_WINDOW) {
    // Wait until the oldest request inside the window ages out of it.
    const oldest = rows[rows.length - 1];
    const windowRemainingMs = OTP_RESEND_WINDOW_MS - (Date.now() - new Date(oldest.created_at).getTime());
    return { retryAfterSeconds: Math.max(Math.ceil(windowRemainingMs / 1000), 1) };
  }

  return null;
}

// Generates and stores a new code for `customerId`, superseding any still-live
// one. Returns { code, expiresAt }; `code` is only for the caller to email —
// it is never logged or persisted in the clear.
export async function issueCustomerLoginOtp({ customerId, email }) {
  const code = generateCode();
  const codeHash = await hashPassword(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await sql`UPDATE customer_login_otps SET consumed_at = now() WHERE customer_id = ${customerId} AND consumed_at IS NULL`;
  await sql`
    INSERT INTO customer_login_otps (customer_id, code_hash, requested_email, expires_at)
    VALUES (${customerId}, ${codeHash}, ${email}, ${expiresAt})
  `;

  return { code, expiresAt };
}

// Throws a LoginOtpError on any failure (none pending, expired, locked, or
// wrong); resolves with nothing on success and marks the code consumed.
export async function verifyCustomerLoginOtp(customerId, submittedCode) {
  const [row] = await sql`
    SELECT * FROM customer_login_otps
    WHERE customer_id = ${customerId} AND consumed_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `;
  if (!row) throw new LoginOtpError("Request a new code to continue.", "none");
  if (new Date(row.expires_at) < new Date()) {
    throw new LoginOtpError("This code has expired. Request a new one.", "expired");
  }
  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    throw new LoginOtpError("Too many incorrect attempts. Request a new code.", "locked");
  }

  const matches = await verifyPassword(String(submittedCode || "").trim(), row.code_hash);
  if (!matches) {
    await sql`UPDATE customer_login_otps SET attempts = attempts + 1 WHERE id = ${row.id}`;
    const remaining = OTP_MAX_ATTEMPTS - (row.attempts + 1);
    throw new LoginOtpError(
      remaining > 0
        ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`
        : "Too many incorrect attempts. Request a new code.",
      remaining > 0 ? "wrong" : "locked"
    );
  }

  await sql`UPDATE customer_login_otps SET consumed_at = now() WHERE id = ${row.id}`;
}
