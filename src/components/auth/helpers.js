export const DEFAULT_LOGIN = {
  email: "",
  password: "",
  rememberMe: false,
};

export const DEFAULT_REGISTER = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  agreeTerms: false,
};

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

const MIN_PASSWORD_LENGTH = 8;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/;

// Weak/breached passwords that technically satisfy the character-class rules
// below but are still guessable in seconds — checked against the raw value,
// not just its character makeup, so they cap the strength score regardless.
const COMMON_PASSWORDS = [
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "qwertyuiop",
  "letmein123",
  "admin1234",
  "welcome123",
  "iloveyou1",
  "abcd1234",
  "abc12345",
];

function hasSequentialRun(value) {
  const lower = value.toLowerCase();
  const runs = ["0123456789", "abcdefghijklmnopqrstuvwxyz", "qwertyuiop"];
  return runs.some((run) => {
    for (let i = 0; i <= run.length - 4; i++) {
      if (lower.includes(run.slice(i, i + 4))) return true;
    }
    return false;
  });
}

export function getPasswordChecks(value) {
  return {
    hasMinLength: value.length >= MIN_PASSWORD_LENGTH,
    hasLetter: /[a-zA-Z]/.test(value),
    hasNumber: /[0-9]/.test(value),
    hasSpecialChar: SPECIAL_CHAR_REGEX.test(value),
  };
}

export function isValidPassword(value) {
  const checks = getPasswordChecks(value);
  return checks.hasMinLength && checks.hasLetter && checks.hasNumber && checks.hasSpecialChar;
}

function joinWithAnd(items) {
  if (items.length <= 1) return items[0] || "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

// Returns null once every rule is satisfied, otherwise one sentence naming
// everything still missing (e.g. "Password must contain a number and a
// special character."), recomputed on every keystroke for live feedback.
export function getPasswordErrorMessage(value) {
  const { hasMinLength, hasLetter, hasNumber, hasSpecialChar } = getPasswordChecks(value);

  const missingChars = [];
  if (!hasLetter) missingChars.push("a letter");
  if (!hasNumber) missingChars.push("a number");
  if (!hasSpecialChar) missingChars.push("a special character");

  const parts = [];
  if (!hasMinLength) parts.push(`be at least ${MIN_PASSWORD_LENGTH} characters`);
  if (missingChars.length) parts.push(`contain ${joinWithAnd(missingChars)}`);

  if (!parts.length) return null;
  return `Password must ${joinWithAnd(parts)}.`;
}

const STRENGTH_LEVELS = {
  low: { label: "Low", percent: 33, barClassName: "bg-red-500", textClassName: "text-red-600 dark:text-red-400" },
  medium: {
    label: "Medium",
    percent: 66,
    barClassName: "bg-amber-500",
    textClassName: "text-amber-600 dark:text-amber-400",
  },
  strong: {
    label: "Strong",
    percent: 100,
    barClassName: "bg-green-500",
    textClassName: "text-green-600 dark:text-green-400",
  },
};

// Returns null for an empty value (nothing to show yet), otherwise one of
// STRENGTH_LEVELS. Scores length, character-class variety and upper/lower
// mix, then caps the result at "low" for a common or sequential password
// regardless of how many boxes it otherwise ticks.
export function getPasswordStrength(value) {
  if (!value) return null;

  const { hasMinLength, hasLetter, hasNumber, hasSpecialChar } = getPasswordChecks(value);
  const hasUpperAndLower = /[a-z]/.test(value) && /[A-Z]/.test(value);
  const isCommon =
    COMMON_PASSWORDS.includes(value.toLowerCase()) ||
    COMMON_PASSWORDS.some((common) => value.toLowerCase().includes(common)) ||
    hasSequentialRun(value) ||
    /^(.)\1+$/.test(value); // a single character repeated, e.g. "aaaaaaaa"

  let score = 0;
  if (hasMinLength) score += 1;
  if (hasLetter && hasNumber && hasSpecialChar) score += 1;
  if (hasUpperAndLower) score += 1;
  if (value.length >= 12) score += 1;
  if (isCommon) score = Math.max(0, score - 2);

  if (score >= 3) return STRENGTH_LEVELS.strong;
  if (score >= 2) return STRENGTH_LEVELS.medium;
  return STRENGTH_LEVELS.low;
}
