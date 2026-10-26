import { sql } from "./db";
import { slugify } from "./shared/slug";

// Categories, tags and collections a product is filed under: find-or-create by name or path.

// Splits a taxonomy path like "Jewelry > Rings > Wedding Bands" into a
// parent/child chain of `categories` rows, reusing any level that already
// exists (by slug or name, scoped to its parent) instead of duplicating it.
export async function upsertCategoryPath(path) {
  const levels = String(path || "")
    .split(">")
    .map((s) => s.trim())
    .filter(Boolean);

  let parentId = null;
  for (const name of levels) {
    const baseSlug = slugify(name);
    // Match by name as well as slug: a level that was created earlier with a
    // disambiguated slug (e.g. "rings-2") must still be found, otherwise every
    // save would try to create it again.
    const [existing] = parentId
      ? await sql`
          SELECT id FROM categories
          WHERE (slug = ${baseSlug} OR lower(name) = lower(${name})) AND parent_id = ${parentId}
          ORDER BY created_at LIMIT 1`
      : await sql`
          SELECT id FROM categories
          WHERE (slug = ${baseSlug} OR lower(name) = lower(${name})) AND parent_id IS NULL
          ORDER BY created_at LIMIT 1`;

    if (existing) {
      parentId = existing.id;
      continue;
    }

    // categories.slug is unique *globally*, not just within a parent, so a
    // same-named category that already exists under a different parent (e.g.
    // "Wedding Bands" at the top level and again under Jewelry > Rings) needs
    // a disambiguated slug rather than failing the whole save.
    let slug = baseSlug;
    let created = null;
    let attempt = 0;
    while (!created) {
      try {
        const rows = await sql`
          INSERT INTO categories (name, slug, parent_id)
          VALUES (${name}, ${slug}, ${parentId})
          RETURNING id
        `;
        created = rows[0];
      } catch (error) {
        if (error.code === "23505" && error.constraint === "categories_slug_key" && attempt < 5) {
          attempt += 1;
          slug = `${baseSlug}-${attempt + 1}`;
          continue;
        }
        throw error;
      }
    }
    parentId = created.id;
  }

  return parentId;
}

// The category paths a save should store, in order, without blanks or repeats.
// The form sends `categories` (every chip) next to the primary `category`;
// CSV import and older clients send only `category`, which counts as one.
export function categoryPathsFromPayload(payload) {
  const raw = Array.isArray(payload.categories) && payload.categories.length ? payload.categories : [payload.category];
  const seen = new Set();
  const paths = [];
  for (const entry of raw) {
    const path = String(entry || "")
      .split(">")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" > ");
    const key = path.toLowerCase();
    if (!path || seen.has(key)) continue;
    seen.add(key);
    paths.push(path);
  }
  return paths;
}

// Resolves each path to its category row, one at a time so paths that share a
// parent don't race to create it. Two paths can land on the same row (a level
// matched by name rather than slug), hence the id de-dupe.
export async function upsertCategoryPaths(paths) {
  const ids = [];
  for (const path of paths) {
    const id = await upsertCategoryPath(path);
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

export async function upsertTags(names) {
  const ids = [];
  for (const name of names || []) {
    if (!name) continue;
    const [existing] = await sql`SELECT id FROM tags WHERE name = ${name}`;
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const [created] = await sql`INSERT INTO tags (name) VALUES (${name}) RETURNING id`;
    ids.push(created.id);
  }
  return ids;
}

export async function upsertCollections(names) {
  const ids = [];
  for (const name of names || []) {
    if (!name) continue;
    const [existing] = await sql`SELECT id FROM collections WHERE name = ${name}`;
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const [created] = await sql`
      INSERT INTO collections (name, slug) VALUES (${name}, ${slugify(name)}) RETURNING id
    `;
    ids.push(created.id);
  }
  return ids;
}
