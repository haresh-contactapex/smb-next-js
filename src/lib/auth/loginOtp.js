import { randomInt } from "crypto";
import { sql } from "@/lib/db";
import { hashPassword, verifyPassword } from "./password";

/**
 * Staff sign-in 2FA: a 6-digit code emailed after the password check, stored
 * as a bcrypt hash in `staff_login_otps` (docs/my-account/staff-login-otp-table-only.sql).
 * Only one code is ever "live" for a user — issuing a new one supersedes the
 * last, so an old emailed code stops working the moment a resend goes out.
 */

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 120_000; // 2 minutes
export const OTP_MAX_ATTEMPTS = 5; // wrong guesses allowed against one code

// Resend rate limiting: a minimum gap between sends, plus a cap on how many
// can be requested in a rolling window, so "Resend OTP" can't be used to
// spam the inbox or brute-force the code via unlimited fresh attempts.
export const OTP_RESEND_COOLDOWN_MS = 30_000;
export const OTP_RESEND_WINDOW_MS = 10 * 60 * 1000;
export const OTP_RESEND_MAX_IN_WINDOW = 5;

// Carries the HTTP status a route should answer with, plus a `code` the
// client can use to decide whether to prompt a resend.
export class LoginOtpError extends Error {
  constructor(message, code, status = 400) {
    super(message);
    this.name = "LoginOtpError";
    this.code = code;
    this.status = status;
  }
}

function generateCode() {
  return String(randomInt(10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
}

async function recentOtps(userId, sinceDate) {
  return sql`
    SELECT * FROM staff_login_otps
    WHERE user_id = ${userId} AND created_at > ${sinceDate}
    ORDER BY created_at DESC
  `;
}

// Returns null when a code may be sent now, or { retryAfterSeconds } when the
// caller must wait — either the cooldown since the last send, or the abuse
// cap for the resend window.
export async function checkOtpRateLimit(userId) {
  const windowStart = new Date(Date.now() - OTP_RESEND_WINDOW_MS);
  const rows = await recentOtps(userId, windowStart);
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

// Generates and stores a new code for `userId`, superseding any still-live
// one. Returns { code, expiresAt }; `code` is only for the caller to email —
// it is never logged or persisted in the clear.
export async function issueLoginOtp({ userId, email }) {
  const code = generateCode();
  const codeHash = await hashPassword(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await sql`UPDATE staff_login_otps SET consumed_at = now() WHERE user_id = ${userId} AND consumed_at IS NULL`;
  await sql`
    INSERT INTO staff_login_otps (user_id, code_hash, requested_email, expires_at)
    VALUES (${userId}, ${codeHash}, ${email}, ${expiresAt})
  `;

  return { code, expiresAt };
}

// Throws a LoginOtpError on any failure (none pending, expired, locked, or
// wrong); resolves with nothing on success and marks the code consumed.
export async function verifyLoginOtp(userId, submittedCode) {
  const [row] = await sql`
    SELECT * FROM staff_login_otps
    WHERE user_id = ${userId} AND consumed_at IS NULL
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
    await sql`UPDATE staff_login_otps SET attempts = attempts + 1 WHERE id = ${row.id}`;
    const remaining = OTP_MAX_ATTEMPTS - (row.attempts + 1);
    throw new LoginOtpError(
      remaining > 0
        ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`
        : "Too many incorrect attempts. Request a new code.",
      remaining > 0 ? "wrong" : "locked"
    );
  }

  await sql`UPDATE staff_login_otps SET consumed_at = now() WHERE id = ${row.id}`;
}
