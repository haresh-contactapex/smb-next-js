// The one way a title becomes a URL handle or slug ("Gold Ring (18K)" -> "gold-ring-18k"), used
// by the product, category and CMS forms and by the server and CSV import, so the same title
// gives the same handle everywhere. Pure: no React, DOM or database access.

// Lower-case letters and digits separated by single hyphens, with none at the ends. `max` cuts
// the result to that many characters (and drops a hyphen the cut leaves at the end).
export function slugify(value, { max } = {}) {
  const slug = String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return max ? slug.slice(0, max).replace(/-+$/, "") : slug;
}
