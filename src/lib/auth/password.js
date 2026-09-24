import { randomInt } from "crypto";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

// Look-alike characters (0/O, 1/l/I) are left out so a password copied by
// hand from an email still works.
const PASSWORD_ALPHABETS = {
  upper: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  lower: "abcdefghijkmnpqrstuvwxyz",
  digit: "23456789",
  special: "!@#$%^&*?-_",
};

// Cryptographically random password that always satisfies isValidPassword
// (letters, a number and a special character): one character from every
// alphabet, the rest from all of them, then shuffled.
export function generateTemporaryPassword(length = 14) {
  const sets = Object.values(PASSWORD_ALPHABETS);
  const all = sets.join("");
  const chars = sets.map((set) => set[randomInt(set.length)]);
  while (chars.length < length) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export async function verifyPassword(plainPassword, passwordHash) {
  if (!passwordHash) return false;
  return bcrypt.compare(plainPassword, passwordHash);
}
