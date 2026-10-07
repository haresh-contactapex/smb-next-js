import { sql, sqlTransaction } from "./db";
import { isMissingRelation, isUuid } from "./accountError";
import { normalizeCmsPageInput } from "./cmsRules";
import { sanitizeCmsHtml } from "./sanitizeHtml";

// Persistence for CMS pages: the admin CRUD behind /api/cms/pages and the reads
// the storefront makes (a published page by URL, the footer links). Cleaning the
// HTML and checking the fields happens here, so every caller gets the same rules
// (the form uses the same checks from cmsRules.js). See docs/cms/cms.md.

export const MAX_REVISIONS = 20;

// A problem the admin can act on. Route handlers answer with `status`; `errors`
// (field -> message) is set when several fields are at fault.
export class CmsError extends Error {
  constructor(message, status = 400, { field = null, errors = null } = {}) {
    super(message);
    this.name = "CmsError";
    this.status = status;
    this.field = field;
    this.errors = errors;
  }
}

const NOT_MIGRATED = "The CMS tables are missing. Run `npm run db:migrate:cms` and try again.";

// Neon reports a table that was never migrated as 42P01 and a duplicate slug as 23505.
function translateError(error) {
  if (isMissingRelation(error)) return new CmsError(NOT_MIGRATED, 503);
  if (error?.code === "23505") {
    return new CmsError("Another page already uses that URL.", 409, { field: "slug", errors: { slug: "Another page already uses that URL." } });
  }
  return error;
}

const iso = (value) => (value instanceof Date ? value.toISOString() : value ?? null);
const personName = (row) => [row.updated_by_first_name, row.updated_by_last_name].filter(Boolean).join(" ") || null;

function rowToPage(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    contentHtml: row.content_html,
    seoTitle: row.seo_title || "",
    seoDescription: row.seo_description || "",
    status: row.status,
    footerGroup: row.footer_group || "",
    footerLabel: row.footer_label || "",
    position: Number(row.position) || 0,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    updatedByName: personName(row),
  };
}

// The list leaves the (large) body out and reports its size instead.
function rowToListItem(row) {
  const { contentHtml, ...page } = rowToPage({ ...row, content_html: "" });
  return { ...page, contentLength: Number(row.content_length) || 0 };
}

export async function listCmsPages() {
  try {
    const rows = await sql`
      SELECT p.id, p.slug, p.title, p.status, p.footer_group, p.footer_label, p.position, p.seo_title, p.seo_description,
             p.created_at, p.updated_at, length(p.content_html) AS content_length,
             u.first_name AS updated_by_first_name, u.last_name AS updated_by_last_name
      FROM cms_pages p
      LEFT JOIN users u ON u.id = p.updated_by
      ORDER BY p.position, p.title
    `;
    return rows.map(rowToListItem);
  } catch (error) {
    throw translateError(error);
  }
}

export async function getCmsPageById(id) {
  if (!isUuid(id)) return null;
  try {
    const [row] = await sql`
      SELECT p.*, u.first_name AS updated_by_first_name, u.last_name AS updated_by_last_name
      FROM cms_pages p
      LEFT JOIN users u ON u.id = p.updated_by
      WHERE p.id = ${id}
    `;
    return row ? rowToPage(row) : null;
  } catch (error) {
    throw translateError(error);
  }
}

// Storefront: the published page at /<slug>, or null. The body is cleaned again
// on the way out, so HTML written to the table by anything other than saveCmsPage
// (a seed script, a manual edit) can never reach a visitor unchecked. A database
// that has not been migrated yet has no pages, so it answers null (a 404) rather
// than failing every unknown URL; any other failure is thrown.
export async function getPublishedCmsPage(slug) {
  if (typeof slug !== "string" || !slug || slug.length > 100) return null;
  let row;
  try {
    [row] = await sql`
      SELECT slug, title, content_html, seo_title, seo_description, updated_at
      FROM cms_pages
      WHERE slug = ${slug} AND status = 'published'
    `;
  } catch (error) {
    if (isMissingRelation(error)) return null;
    throw error;
  }
  if (!row) return null;
  return {
    slug: row.slug,
    title: row.title,
    contentHtml: sanitizeCmsHtml(row.content_html),
    seoTitle: row.seo_title || "",
    seoDescription: row.seo_description || "",
    updatedAt: iso(row.updated_at),
  };
}

// Storefront footer: published pages that are placed in a footer column.
export async function listFooterPages() {
  try {
    const rows = await sql`
      SELECT slug, title, footer_group, footer_label, position
      FROM cms_pages
      WHERE status = 'published' AND footer_group IS NOT NULL
      ORDER BY position, title
    `;
    return rows.map((row) => ({ slug: row.slug, label: row.footer_label || row.title, footerGroup: row.footer_group, position: Number(row.position) || 0 }));
  } catch (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
}

function validated(input) {
  const { values, errors } = normalizeCmsPageInput(input);
  const first = Object.keys(errors)[0];
  if (first) throw new CmsError(errors[first], 400, { field: first, errors });
  return { ...values, contentHtml: sanitizeCmsHtml(values.contentHtml) };
}

const optionalText = (value) => value || null;

// Publishing (and taking a page back to draft) is its own permission, content.publish.
// The route works out whether the staff member holds it and passes `canPublish`.
export async function createCmsPage(input, actor, { canPublish = false } = {}) {
  const values = validated(input);
  if (values.status === "published" && !canPublish) {
    throw new CmsError("You don't have permission to publish pages. Save it as a draft instead.", 403, { field: "status" });
  }
  const actorId = actor?.id || null;
  try {
    const [row] = await sql`
      INSERT INTO cms_pages
        (slug, title, content_html, seo_title, seo_description, status, footer_group, footer_label, position, created_by, updated_by)
      VALUES
        (${values.slug}, ${values.title}, ${values.contentHtml}, ${optionalText(values.seoTitle)},
         ${optionalText(values.seoDescription)}, ${values.status}, ${values.footerGroup}, ${optionalText(values.footerLabel)},
         COALESCE(${values.position}::integer, (SELECT COALESCE(MAX(position), 0) + 10 FROM cms_pages)),
         ${actorId}::uuid, ${actorId}::uuid)
      RETURNING id
    `;
    return row.id;
  } catch (error) {
    throw translateError(error);
  }
}

/**
 * Saves a page. `expectedUpdatedAt` is the `updatedAt` the editor loaded: when
 * someone else saved in between, nothing is written and a 409 comes back. The
 * previous title and body are kept as a revision (the latest MAX_REVISIONS stay).
 */
export async function updateCmsPage(id, input, actor, { expectedUpdatedAt = null, canPublish = false } = {}) {
  const values = validated(input);
  const current = await getCmsPageById(id);
  if (!current) throw new CmsError("That page no longer exists.", 404);
  if (values.status !== current.status && !canPublish) {
    throw new CmsError("You don't have permission to publish or unpublish pages.", 403, { field: "status" });
  }

  let expected = null;
  if (expectedUpdatedAt) {
    const time = new Date(expectedUpdatedAt);
    if (Number.isNaN(time.getTime())) throw new CmsError("That request wasn't valid.", 400);
    expected = time.toISOString();
  }
  const position = values.position ?? current.position;
  const actorId = actor?.id || null;

  try {
    // Statements run in order and together. The revision is only written when the
    // page is still the version the editor saw, the same test the UPDATE makes.
    const [, updated] = await sqlTransaction((tx) => [
      tx`
        INSERT INTO cms_page_revisions (page_id, title, content_html, edited_by)
        SELECT id, title, content_html, ${actorId}::uuid FROM cms_pages
        WHERE id = ${id}
          AND (${expected}::timestamptz IS NULL OR date_trunc('milliseconds', updated_at) = ${expected}::timestamptz)
          AND (title <> ${values.title} OR content_html <> ${values.contentHtml})
      `,
      tx`
        UPDATE cms_pages SET
          slug = ${values.slug}, title = ${values.title}, content_html = ${values.contentHtml},
          seo_title = ${optionalText(values.seoTitle)}, seo_description = ${optionalText(values.seoDescription)},
          status = ${values.status}, footer_group = ${values.footerGroup}, footer_label = ${optionalText(values.footerLabel)},
          position = ${position},
          updated_by = ${actorId}::uuid, updated_at = now()
        WHERE id = ${id}
          AND (${expected}::timestamptz IS NULL OR date_trunc('milliseconds', updated_at) = ${expected}::timestamptz)
        RETURNING id
      `,
      tx`
        DELETE FROM cms_page_revisions
        WHERE page_id = ${id}
          AND id NOT IN (
            SELECT id FROM cms_page_revisions WHERE page_id = ${id} ORDER BY created_at DESC LIMIT ${MAX_REVISIONS}
          )
      `,
    ]);
    if (!updated.length) {
      throw new CmsError("Someone else saved this page while you were editing it. Reload the page to see their version.", 409);
    }
    return id;
  } catch (error) {
    throw translateError(error);
  }
}

export async function deleteCmsPage(id) {
  if (!isUuid(id)) throw new CmsError("That page no longer exists.", 404);
  try {
    const [row] = await sql`DELETE FROM cms_pages WHERE id = ${id} RETURNING id, slug, title`;
    if (!row) throw new CmsError("That page no longer exists.", 404);
    return { id: row.id, slug: row.slug, title: row.title };
  } catch (error) {
    throw translateError(error);
  }
}

export async function listCmsRevisions(pageId) {
  if (!isUuid(pageId)) return [];
  try {
    const rows = await sql`
      SELECT r.id, r.title, r.created_at, length(r.content_html) AS content_length,
             u.first_name, u.last_name
      FROM cms_page_revisions r
      LEFT JOIN users u ON u.id = r.edited_by
      WHERE r.page_id = ${pageId}
      ORDER BY r.created_at DESC
    `;
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      createdAt: iso(row.created_at),
      contentLength: Number(row.content_length) || 0,
      savedByName: [row.first_name, row.last_name].filter(Boolean).join(" ") || null,
    }));
  } catch (error) {
    throw translateError(error);
  }
}

export async function getCmsRevision(pageId, revisionId) {
  if (!isUuid(pageId) || !isUuid(revisionId)) return null;
  try {
    const [row] = await sql`
      SELECT id, title, content_html, created_at FROM cms_page_revisions
      WHERE id = ${revisionId} AND page_id = ${pageId}
    `;
    return row ? { id: row.id, title: row.title, contentHtml: row.content_html, createdAt: iso(row.created_at) } : null;
  } catch (error) {
    throw translateError(error);
  }
}

