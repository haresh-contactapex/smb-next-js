// Imported from their specific submodules, not the "jose" aggregate index —
// that index also pulls in JWE (encryption) code that needs Node's
// CompressionStream, which isn't available in the Edge Runtime middleware.js
// runs in, even though this file never uses JWE.
import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

function getSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set. Add it to your .env.local file.");
  }
  return new TextEncoder().encode(secret);
}

// `expiresIn` is any value jose's setExpirationTime accepts, e.g. "2h", "30d".
export async function signJwt(payload, expiresIn) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecretKey());
}

// Returns the verified payload, or null if the token is missing/invalid/expired.
// Never throws — callers treat "no session" and "bad session" the same way.
export async function verifyJwt(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload;
  } catch {
    return null;
  }
}
