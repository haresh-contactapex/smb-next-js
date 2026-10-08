// Parses a bulk-action body `{ ids: [uuid, ...] }` for the list DELETE routes
// (coupons, reviews, CMS pages, blog posts, media) and bulk order cancel.
// Duplicates are dropped.
// Returns { ids } or { error } — a message suitable for a 400 response.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_BULK_IDS = 1000;

export async function readBulkIds(request, noun, verb = "delete") {
  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids) ? [...new Set(body.ids)] : null;
  if (!ids || ids.length === 0) return { error: `Select at least one ${noun} to ${verb}.` };
  if (ids.length > MAX_BULK_IDS || ids.some((id) => typeof id !== "string" || !UUID_PATTERN.test(id))) {
    return { error: `Invalid ${noun} selection.` };
  }
  return { ids };
}
