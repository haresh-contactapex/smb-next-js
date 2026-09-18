import { sql } from "./db";

export function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Builds each category's ancestor path (e.g. "Jewelry > Rings") from the full
// flat list, rather than issuing a recursive query per row.
function pathFor(row, byId) {
  const parts = [];
  let current = row;
  const seen = new Set();
  while (current?.parent_id && !seen.has(current.id)) {
    seen.add(current.id);
    const parent = byId.get(current.parent_id);
    if (!parent) break;
    parts.unshift(parent.name);
    current = parent;
  }
  return parts.join(" > ") || null;
}

export async function listCategories() {
  const rows = await sql`
    SELECT
      c.id, c.name, c.slug, c.parent_id, c.description, c.image_url,
      c.theme_template, c.is_visible, c.seo_title, c.seo_description,
      COALESCE(pc.product_count, 0) AS product_count
    FROM categories c
    LEFT JOIN (
      WITH RECURSIVE descendants AS (
        SELECT id, id AS root_id FROM categories
        UNION ALL
        SELECT ch.id, d.root_id
        FROM categories ch
        JOIN descendants d ON ch.parent_id = d.id
      )
      SELECT d.root_id, COUNT(p.id) AS product_count
      FROM descendants d
      LEFT JOIN products p ON p.category_id = d.id
      GROUP BY d.root_id
    ) pc ON pc.root_id = c.id
    ORDER BY c.name
  `;

  const byId = new Map(rows.map((r) => [r.id, r]));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    parentId: row.parent_id,
    parentPath: pathFor(row, byId),
    description: row.description || "",
    imageUrl: row.image_url || null,
    themeTemplate: row.theme_template,
    visible: row.is_visible,
    seoTitle: row.seo_title || "",
    seoDescription: row.seo_description || "",
    productCount: Number(row.product_count) || 0,
  }));
}

export async function getCategoryById(id) {
  const [category] = await sql`SELECT * FROM categories WHERE id = ${id}`;
  if (!category) return null;

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    parentId: category.parent_id,
    description: category.description || "",
    imageUrl: category.image_url || null,
    themeTemplate: category.theme_template,
    visible: category.is_visible,
    seoTitle: category.seo_title || "",
    seoDescription: category.seo_description || "",
  };
}

async function assertNotCircular(id, parentId) {
  if (!id || !parentId) return;
  let current = parentId;
  const seen = new Set();
  while (current) {
    if (current === id) throw new Error("A category can't be its own ancestor");
    if (seen.has(current)) break;
    seen.add(current);
    const [row] = await sql`SELECT parent_id FROM categories WHERE id = ${current}`;
    current = row?.parent_id || null;
  }
}

function categoryValues(payload) {
  const name = payload.name?.trim();
  return {
    name,
    slug: payload.slug?.trim() || slugify(name),
    parent_id: payload.parentId || null,
    description: payload.description || null,
    image_url: payload.imageUrl || null,
    theme_template: payload.themeTemplate || "default",
    is_visible: payload.visible ?? true,
    seo_title: payload.seoTitle || null,
    seo_description: payload.seoDescription || null,
  };
}

export async function createCategory(payload) {
  const values = categoryValues(payload);
  await assertNotCircular(null, values.parent_id);

  const [created] = await sql`
    INSERT INTO categories (
      name, slug, parent_id, description, image_url, theme_template, is_visible, seo_title, seo_description
    ) VALUES (
      ${values.name}, ${values.slug}, ${values.parent_id}, ${values.description}, ${values.image_url},
      ${values.theme_template}, ${values.is_visible}, ${values.seo_title}, ${values.seo_description}
    )
    RETURNING id
  `;
  return created.id;
}

export async function updateCategory(id, payload) {
  const values = categoryValues(payload);
  await assertNotCircular(id, values.parent_id);

  await sql`
    UPDATE categories SET
      name = ${values.name}, slug = ${values.slug}, parent_id = ${values.parent_id},
      description = ${values.description}, image_url = ${values.image_url},
      theme_template = ${values.theme_template}, is_visible = ${values.is_visible},
      seo_title = ${values.seo_title}, seo_description = ${values.seo_description},
      updated_at = now()
    WHERE id = ${id}
  `;
  return id;
}

export async function deleteCategory(id) {
  await sql`DELETE FROM categories WHERE id = ${id}`;
}
