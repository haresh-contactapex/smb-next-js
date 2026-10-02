// Thrown by the customer-account lib modules for problems the customer can
// understand and fix. Route handlers turn `status` into the HTTP status and
// `field` (when set) names the form field at fault, so the page can mark it.
export class AccountError extends Error {
  constructor(message, status = 400, field) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value) => typeof value === "string" && UUID_PATTERN.test(value);

// Postgres "undefined_table" / "undefined_column": the optional table or column
// a query needs hasn't been migrated into this database.
export function isMissingRelation(error) {
  return error?.code === "42P01" || error?.code === "42703";
}

// Runs an optional lookup (an enrichment that a store without the full schema
// may not have) and falls back to `fallback` only when its table is missing.
// Any other failure is a real error and still propagates.
export async function optionalQuery(run, fallback) {
  try {
    return await run();
  } catch (error) {
    if (isMissingRelation(error)) return fallback;
    throw error;
  }
}

// Trims a request-body string and caps it, so an oversized value is cut rather
// than failing deep inside the database.
export function cleanText(value, maxLength) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

// Loads one part of an account page. A failure is logged and reported as null,
// so a section that can't load (a table not migrated yet, a database hiccup)
// says so itself instead of taking the whole page down.
export async function loadOrNull(label, run) {
  try {
    return await run();
  } catch (error) {
    console.error(`Account ${label} failed to load`, error);
    return null;
  }
}
