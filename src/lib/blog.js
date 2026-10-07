import { sql, sqlTransaction } from "./db";
import { isMissingRelation, isUuid } from "./accountError";
import { BLOG_PAGE_SIZE, blogPostPath, normalizeBlogPostInput, todayIso } from "./blogRules";
import { sanitizeCmsHtml } from "./sanitizeHtml";

// Persistence for blog posts: the admin CRUD behind /api/blog/posts and the reads
// the storefront makes (the listing, a published post by URL, the footer link).
// Cleaning the HTML and checking the fields happens here, so every caller gets the
// same rules (the form uses the same checks from blogRules.js). See docs/blog/blog.md.

export const MAX_REVISIONS = 20;

// A problem the admin can act on. Route handlers answer with `status`; `errors`
// (field -> message) is set when several fields are at fault.
export class BlogError extends Error {
  constructor(message, status = 400, { field = null, errors = null } = {}) {
    super(message);
    this.name = "BlogError";
    this.status = status;
    this.field = field;
    this.errors = errors;
  }
}

const NOT_MIGRATED = "The blog tables are missing. Run `npm run db:migrate:blog` and try again.";

// Neon reports a table that was never migrated as 42P01 and a duplicate slug as 23505.
function translateError(error) {
  if (isMissingRelation(error)) return new BlogError(NOT_MIGRATED, 503);
  if (error?.code === "23505") {
    return new BlogError("Another post already uses that URL.", 409, { field: "slug", errors: { slug: "Another post already uses that URL." } });
  }
  return error;
}

const iso = (value) => (value instanceof Date ? value.toISOString() : value ?? null);
const personName = (row) => [row.updated_by_first_name, row.updated_by_last_name].filter(Boolean).join(" ") || null;

// The storefront shows a post once it is published and its date has come (a published
// post dated in the future is scheduled). Written out in each query because a tagged
// template cannot take a SQL fragment: published_on <= today in UTC.
//   p.status = 'published' AND p.published_on <= (now() AT TIME ZONE 'UTC')::date

function rowToPost(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt || "",
    contentHtml: row.content_html,
    featuredImageUrl: row.featured_image_url || "",
    featuredImageAlt: row.featured_image_alt || "",
    category: row.category_name,
    categorySlug: row.category_slug,
    author: row.author_name || "",
    tags: Array.isArray(row.tags) ? row.tags : [],
    publishedOn: row.published_on || "",
    seoTitle: row.seo_title || "",
    seoDescription: row.seo_description || "",
    status: row.status,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    updatedByName: personName(row),
  };
}

// The list leaves the (large) body out and reports its size instead.
function rowToListItem(row) {
  const { contentHtml, ...post } = rowToPost({ ...row, content_html: "" });
  return { ...post, contentLength: Number(row.content_length) || 0 };
}

export async function listBlogPosts() {
  try {
    const rows = await sql`
      SELECT p.id, p.slug, p.title, p.excerpt, p.featured_image_url, p.featured_image_alt, p.category_name, p.category_slug,
             p.author_name, p.tags, to_char(p.published_on, 'YYYY-MM-DD') AS published_on, p.status,
             p.seo_title, p.seo_description, p.created_at, p.updated_at, length(p.content_html) AS content_length,
             u.first_name AS updated_by_first_name, u.last_name AS updated_by_last_name
      FROM blog_posts p
      LEFT JOIN users u ON u.id = p.updated_by
      ORDER BY p.published_on DESC, p.created_at DESC, p.id
    `;
    return rows.map(rowToListItem);
  } catch (error) {
    throw translateError(error);
  }
}

export async function getBlogPostById(id) {
  if (!isUuid(id)) return null;
  try {
    const [row] = await sql`
      SELECT p.id, p.slug, p.title, p.excerpt, p.content_html, p.featured_image_url, p.featured_image_alt, p.category_name,
             p.category_slug, p.author_name, p.tags, to_char(p.published_on, 'YYYY-MM-DD') AS published_on, p.status,
             p.seo_title, p.seo_description, p.created_at, p.updated_at,
             u.first_name AS updated_by_first_name, u.last_name AS updated_by_last_name
      FROM blog_posts p
      LEFT JOIN users u ON u.id = p.updated_by
      WHERE p.id = ${id}
    `;
    return row ? rowToPost(row) : null;
  } catch (error) {
    throw translateError(error);
  }
}

// Categories that have at least one post (drafts included), for the editor's category list.
export async function listBlogCategories() {
  try {
    const rows = await sql`
      SELECT category_slug, max(category_name) AS category_name, count(*) AS post_count
      FROM blog_posts
      GROUP BY category_slug
      ORDER BY lower(max(category_name))
    `;
    return rows.map((row) => ({ slug: row.category_slug, name: row.category_name, count: Number(row.post_count) || 0 }));
  } catch (error) {
    throw translateError(error);
  }
}

function validated(input) {
  const { values, errors } = normalizeBlogPostInput(input);
  const first = Object.keys(errors)[0];
  if (first) throw new BlogError(errors[first], 400, { field: first, errors });
  return { ...values, contentHtml: sanitizeCmsHtml(values.contentHtml) };
}

const optionalText = (value) => value || null;

// Posts of one category share one name: typing "classic bands" for a category that
// already exists as "Classic Bands" keeps the existing spelling. `excludeId` is the post
// being edited, so a category that only it uses can still be respelled.
async function canonicalCategoryName(values, excludeId = null) {
  const [row] = await sql`
    SELECT category_name FROM blog_posts
    WHERE category_slug = ${values.categorySlug} AND (${excludeId}::uuid IS NULL OR id <> ${excludeId}::uuid)
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  return row?.category_name || values.category;
}

// A published post always has a date: it defaults to today.
const dateFor = (values) => values.publishedOn || (values.status === "published" ? todayIso() : null);

// Publishing (and taking a post back to draft) is its own permission, blog.publish.
// The route works out whether the staff member holds it and passes `canPublish`.
export async function createBlogPost(input, actor, { canPublish = false } = {}) {
  const values = validated(input);
  if (values.status === "published" && !canPublish) {
    throw new BlogError("You don't have permission to publish posts. Save it as a draft instead.", 403, { field: "status" });
  }
  const actorId = actor?.id || null;
  try {
    const category = await canonicalCategoryName(values);
    const [row] = await sql`
      INSERT INTO blog_posts
        (slug, title, excerpt, content_html, featured_image_url, featured_image_alt, category_name, category_slug,
         author_name, tags, published_on, seo_title, seo_description, status, created_by, updated_by)
      VALUES
        (${values.slug}, ${values.title}, ${optionalText(values.excerpt)}, ${values.contentHtml},
         ${optionalText(values.featuredImageUrl)}, ${optionalText(values.featuredImageAlt)}, ${category}, ${values.categorySlug},
         ${optionalText(values.author)}, ${values.tags}::text[], ${dateFor(values)}::date,
         ${optionalText(values.seoTitle)}, ${optionalText(values.seoDescription)}, ${values.status},
         ${actorId}::uuid, ${actorId}::uuid)
      RETURNING id
    `;
    return row.id;
  } catch (error) {
    throw translateError(error);
  }
}

/**
 * Saves a post. `expectedUpdatedAt` is the `updatedAt` the editor loaded: when
 * someone else saved in between, nothing is written and a 409 comes back. The
 * previous title and body are kept as a revision (the latest MAX_REVISIONS stay).
 */
export async function updateBlogPost(id, input, actor, { expectedUpdatedAt = null, canPublish = false } = {}) {
  const values = validated(input);
  const current = await getBlogPostById(id);
  if (!current) throw new BlogError("That post no longer exists.", 404);
  if (values.status !== current.status && !canPublish) {
    throw new BlogError("You don't have permission to publish or unpublish posts.", 403, { field: "status" });
  }

  let expected = null;
  if (expectedUpdatedAt) {
    const time = new Date(expectedUpdatedAt);
    if (Number.isNaN(time.getTime())) throw new BlogError("That request wasn't valid.", 400);
    expected = time.toISOString();
  }
  const actorId = actor?.id || null;

  try {
    const category = await canonicalCategoryName(values, id);
    // Statements run in order and together. The revision is only written when the
    // post is still the version the editor saw, the same test the UPDATE makes.
    const [, updated] = await sqlTransaction((tx) => [
      tx`
        INSERT INTO blog_post_revisions (post_id, title, content_html, edited_by)
        SELECT id, title, content_html, ${actorId}::uuid FROM blog_posts
        WHERE id = ${id}
          AND (${expected}::timestamptz IS NULL OR date_trunc('milliseconds', updated_at) = ${expected}::timestamptz)
          AND (title <> ${values.title} OR content_html <> ${values.contentHtml})
      `,
      tx`
        UPDATE blog_posts SET
          slug = ${values.slug}, title = ${values.title}, excerpt = ${optionalText(values.excerpt)}, content_html = ${values.contentHtml},
          featured_image_url = ${optionalText(values.featuredImageUrl)}, featured_image_alt = ${optionalText(values.featuredImageAlt)},
          category_name = ${category}, category_slug = ${values.categorySlug}, author_name = ${optionalText(values.author)},
          tags = ${values.tags}::text[], published_on = ${dateFor(values)}::date,
          seo_title = ${optionalText(values.seoTitle)}, seo_description = ${optionalText(values.seoDescription)},
          status = ${values.status}, updated_by = ${actorId}::uuid, updated_at = now()
        WHERE id = ${id}
          AND (${expected}::timestamptz IS NULL OR date_trunc('milliseconds', updated_at) = ${expected}::timestamptz)
        RETURNING id
      `,
      tx`
        DELETE FROM blog_post_revisions
        WHERE post_id = ${id}
          AND id NOT IN (
            SELECT id FROM blog_post_revisions WHERE post_id = ${id} ORDER BY created_at DESC LIMIT ${MAX_REVISIONS}
          )
      `,
    ]);
    if (!updated.length) {
      throw new BlogError("Someone else saved this post while you were editing it. Reload the page to see their version.", 409);
    }
    return id;
  } catch (error) {
    throw translateError(error);
  }
}

export async function deleteBlogPost(id) {
  if (!isUuid(id)) throw new BlogError("That post no longer exists.", 404);
  try {
    const [row] = await sql`DELETE FROM blog_posts WHERE id = ${id} RETURNING id, slug, title, category_slug`;
    if (!row) throw new BlogError("That post no longer exists.", 404);
    return { id: row.id, slug: row.slug, title: row.title, categorySlug: row.category_slug };
  } catch (error) {
    throw translateError(error);
  }
}

export async function listBlogRevisions(postId) {
  if (!isUuid(postId)) return [];
  try {
    const rows = await sql`
      SELECT r.id, r.title, r.created_at, length(r.content_html) AS content_length,
             u.first_name, u.last_name
      FROM blog_post_revisions r
      LEFT JOIN users u ON u.id = r.edited_by
      WHERE r.post_id = ${postId}
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

export async function getBlogRevision(postId, revisionId) {
  if (!isUuid(postId) || !isUuid(revisionId)) return null;
  try {
    const [row] = await sql`
      SELECT id, title, content_html, created_at FROM blog_post_revisions
      WHERE id = ${revisionId} AND post_id = ${postId}
    `;
    return row ? { id: row.id, title: row.title, contentHtml: row.content_html, createdAt: iso(row.created_at) } : null;
  } catch (error) {
    throw translateError(error);
  }
}

// ---------------------------------------------------------------------------
// Storefront reads. A database that has not been migrated yet simply has no
// posts (an empty blog, a 404 for a post URL) rather than failing the page; any
// other failure is thrown.
// ---------------------------------------------------------------------------

// A card on the blog listing. Without a written summary it shows the start of the body.
function rowToCard(row) {
  const fallback = String(row.excerpt_fallback || "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt || fallback,
    featuredImageUrl: row.featured_image_url || "",
    featuredImageAlt: row.featured_image_alt || "",
    category: row.category_name,
    categorySlug: row.category_slug,
    author: row.author_name || "",
    publishedOn: row.published_on || "",
    href: blogPostPath(row.category_slug, row.slug),
  };
}

/**
 * One page of the published posts, newest first, optionally of one category.
 * Returns { posts, total, page, pageSize, totalPages }; `page` is clamped to the last page.
 */
export async function listPublishedBlogPosts({ categorySlug = "", page = 1, pageSize = BLOG_PAGE_SIZE } = {}) {
  const category = typeof categorySlug === "string" ? categorySlug : "";
  const size = Math.max(1, Math.min(50, Number(pageSize) || BLOG_PAGE_SIZE));
  try {
    const [{ total }] = await sql`
      SELECT count(*) AS total FROM blog_posts p
      WHERE p.status = 'published' AND p.published_on <= (now() AT TIME ZONE 'UTC')::date
        AND (${category}::text = '' OR p.category_slug = ${category})
    `;
    const count = Number(total) || 0;
    const totalPages = Math.max(1, Math.ceil(count / size));
    const current = Math.min(Math.max(1, Math.floor(Number(page)) || 1), totalPages);
    const rows = await sql`
      SELECT p.slug, p.title, p.excerpt, left(regexp_replace(p.content_html, '<[^>]+>', ' ', 'g'), 600) AS excerpt_fallback,
             p.featured_image_url, p.featured_image_alt, p.category_name, p.category_slug, p.author_name,
             to_char(p.published_on, 'YYYY-MM-DD') AS published_on
      FROM blog_posts p
      WHERE p.status = 'published' AND p.published_on <= (now() AT TIME ZONE 'UTC')::date
        AND (${category}::text = '' OR p.category_slug = ${category})
      ORDER BY p.published_on DESC, p.created_at DESC, p.id
      LIMIT ${size} OFFSET ${(current - 1) * size}
    `;
    return { posts: rows.map(rowToCard), total: count, page: current, pageSize: size, totalPages };
  } catch (error) {
    if (isMissingRelation(error)) return { posts: [], total: 0, page: 1, pageSize: size, totalPages: 1 };
    throw error;
  }
}

// The categories that have a live post, with how many, for the listing's filter.
export async function listPublishedBlogCategories() {
  try {
    const rows = await sql`
      SELECT p.category_slug, max(p.category_name) AS category_name, count(*) AS post_count
      FROM blog_posts p
      WHERE p.status = 'published' AND p.published_on <= (now() AT TIME ZONE 'UTC')::date
      GROUP BY p.category_slug
      ORDER BY lower(max(p.category_name))
    `;
    return rows.map((row) => ({ slug: row.category_slug, name: row.category_name, count: Number(row.post_count) || 0 }));
  } catch (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
}

// Whether the storefront has any post to show, which decides if the footer links to the blog.
export async function hasPublishedBlogPosts() {
  try {
    const rows = await sql`
      SELECT 1 FROM blog_posts p
      WHERE p.status = 'published' AND p.published_on <= (now() AT TIME ZONE 'UTC')::date
      LIMIT 1
    `;
    return rows.length > 0;
  } catch (error) {
    if (isMissingRelation(error)) return false;
    throw error;
  }
}

const neighbour = (row) => (row ? { slug: row.slug, title: row.title, categorySlug: row.category_slug, href: blogPostPath(row.category_slug, row.slug) } : null);

/**
 * Storefront: the live post with this handle, or null. The handle is unique across
 * posts, so the caller compares `categorySlug` with the URL it was asked for and
 * redirects when the post has moved category. The body is cleaned again on the way
 * out, so HTML written to the table by anything other than saveBlogPost (a seed script,
 * a manual edit) can never reach a visitor unchecked. `previous` is the next older
 * post of the same category and `next` the next newer one.
 */
export async function getPublishedBlogPost(slug) {
  if (typeof slug !== "string" || !slug || slug.length > 120) return null;
  let row;
  try {
    [row] = await sql`
      SELECT p.id, p.slug, p.title, p.excerpt, p.content_html, p.featured_image_url, p.featured_image_alt,
             p.category_name, p.category_slug, p.author_name, p.tags, to_char(p.published_on, 'YYYY-MM-DD') AS published_on,
             p.seo_title, p.seo_description, p.updated_at
      FROM blog_posts p
      WHERE p.slug = ${slug} AND p.status = 'published' AND p.published_on <= (now() AT TIME ZONE 'UTC')::date
    `;
  } catch (error) {
    if (isMissingRelation(error)) return null;
    throw error;
  }
  if (!row) return null;

  const [[older], [newer]] = await Promise.all([
    sql`
      SELECT q.slug, q.title, q.category_slug FROM blog_posts q
      WHERE q.category_slug = ${row.category_slug} AND q.id <> ${row.id}
        AND q.status = 'published' AND q.published_on <= (now() AT TIME ZONE 'UTC')::date
        AND (q.published_on, q.created_at, q.id) < (SELECT c.published_on, c.created_at, c.id FROM blog_posts c WHERE c.id = ${row.id})
      ORDER BY q.published_on DESC, q.created_at DESC, q.id DESC
      LIMIT 1
    `,
    sql`
      SELECT q.slug, q.title, q.category_slug FROM blog_posts q
      WHERE q.category_slug = ${row.category_slug} AND q.id <> ${row.id}
        AND q.status = 'published' AND q.published_on <= (now() AT TIME ZONE 'UTC')::date
        AND (q.published_on, q.created_at, q.id) > (SELECT c.published_on, c.created_at, c.id FROM blog_posts c WHERE c.id = ${row.id})
      ORDER BY q.published_on ASC, q.created_at ASC, q.id ASC
      LIMIT 1
    `,
  ]);

  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt || "",
    contentHtml: sanitizeCmsHtml(row.content_html),
    featuredImageUrl: row.featured_image_url || "",
    featuredImageAlt: row.featured_image_alt || "",
    category: row.category_name,
    categorySlug: row.category_slug,
    author: row.author_name || "",
    tags: Array.isArray(row.tags) ? row.tags : [],
    publishedOn: row.published_on || "",
    seoTitle: row.seo_title || "",
    seoDescription: row.seo_description || "",
    updatedAt: iso(row.updated_at),
    previous: neighbour(older),
    next: neighbour(newer),
  };
}
