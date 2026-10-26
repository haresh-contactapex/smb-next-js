// Identifier checks shared by the server, the API routes and the forms. Pure: no React, DOM
// or database access.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// True for a string in the 8-4-4-4-12 hex form that every primary key here uses. Anything else
// (a number, an array, "undefined") is false, so a bad id can be refused before it reaches
// Postgres, which would answer it with a 22P02 error.
export const isUuid = (value) => typeof value === "string" && UUID_PATTERN.test(value);

// The distinct ids in a list, or null when `value` is not a list, is empty, longer than `max`,
// or holds anything that is not a UUID.
export function parseUuidList(value, { max = Infinity } = {}) {
  if (!Array.isArray(value)) return null;
  const ids = [...new Set(value)];
  if (ids.length === 0 || ids.length > max || !ids.every(isUuid)) return null;
  return ids;
}
