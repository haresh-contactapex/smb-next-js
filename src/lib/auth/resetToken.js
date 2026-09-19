import { randomBytes, createHash } from "crypto";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour, matches auth-database-schema.md

// Returns { rawToken, tokenHash, expiresAt }. Only tokenHash is ever persisted —
// rawToken is what goes in the emailed link and is never stored.
export function createResetToken() {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  return { rawToken, tokenHash, expiresAt };
}

export function hashResetToken(rawToken) {
  return createHash("sha256").update(rawToken).digest("hex");
}
