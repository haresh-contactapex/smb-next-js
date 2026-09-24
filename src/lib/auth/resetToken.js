import { randomBytes, createHash } from "crypto";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour, matches auth-database-schema.md

// A new staff account's "set your password" link: long enough to cover a
// weekend, since the recipient didn't ask for it and may not see it at once.
export const WELCOME_TOKEN_TTL_MS = 72 * 60 * 60 * 1000;

// Returns { rawToken, tokenHash, expiresAt }. Only tokenHash is ever persisted —
// rawToken is what goes in the emailed link and is never stored.
export function createResetToken(ttlMs = RESET_TOKEN_TTL_MS) {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + ttlMs);
  return { rawToken, tokenHash, expiresAt };
}

export function hashResetToken(rawToken) {
  return createHash("sha256").update(rawToken).digest("hex");
}
