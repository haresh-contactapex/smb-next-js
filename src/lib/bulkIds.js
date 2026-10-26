// Parses a bulk-action body `{ ids: [uuid, ...] }` for the list DELETE routes
// (products, customers, coupons, reviews, CMS pages, blog posts, media) and bulk order cancel.
// Duplicates are dropped.
// Returns { ids } or { error } — a message suitable for a 400 response.

import { parseUuidList } from "./shared/ids";

export const MAX_BULK_IDS = 1000;

export async function readBulkIds(request, noun, verb = "delete", { max = MAX_BULK_IDS } = {}) {
  const body = await request.json().catch(() => null);
  const unique = Array.isArray(body?.ids) ? new Set(body.ids) : null;
  if (!unique || unique.size === 0) return { error: `Select at least one ${noun} to ${verb}.` };
  const ids = parseUuidList([...unique], { max });
  if (!ids) return { error: `Invalid ${noun} selection.` };
  return { ids };
}
