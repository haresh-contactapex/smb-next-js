import {
  CMS_SEO_DESCRIPTION_ADVICE,
  CMS_SEO_DESCRIPTION_MAX,
  CMS_SEO_TITLE_ADVICE,
  CMS_SEO_TITLE_MAX,
  CMS_STATUSES,
} from "./cmsRules";

// Rules for blog posts shared by the admin form and the server, so both reject the
// same input. No server imports: the client bundle uses this file too.
// See docs/blog/blog.md.

export const BLOG_TITLE_MAX = 200;
export const BLOG_SLUG_MAX = 120;
export const BLOG_EXCERPT_MAX = 500;
export const BLOG_CONTENT_MAX = 200000;
export const BLOG_CATEGORY_MAX = 80;
export const BLOG_AUTHOR_MAX = 100;
export const BLOG_TAG_MAX = 60;
export const BLOG_TAGS_MAX_COUNT = 20;
export const BLOG_IMAGE_URL_MAX = 500;
export const BLOG_IMAGE_ALT_MAX = 200;

// Same limits and guidance as CMS pages.
export const BLOG_SEO_TITLE_MAX = CMS_SEO_TITLE_MAX;
export const BLOG_SEO_DESCRIPTION_MAX = CMS_SEO_DESCRIPTION_MAX;
export const BLOG_SEO_TITLE_ADVICE = CMS_SEO_TITLE_ADVICE;
export const BLOG_SEO_DESCRIPTION_ADVICE = CMS_SEO_DESCRIPTION_ADVICE;
export const BLOG_STATUSES = CMS_STATUSES;

// The storefront shows this many posts on a listing page.
export const BLOG_PAGE_SIZE = 9;

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function blogSlugify(value, max = BLOG_SLUG_MAX) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, max)
    .replace(/-$/, "");
}

// A category is stored by name; its URL segment is always the slug of that name.
export const categorySlugFor = (name) => blogSlugify(name, 80);

// Where the storefront serves a post and a category (the paths the old store used).
export const blogPostPath = (categorySlug, slug) => `/blogs/${categorySlug}/${slug}`;
export const blogCategoryPath = (categorySlug) => `/blogs/${categorySlug}`;
export const BLOG_INDEX_PATH = "/blog";

export function blogSlugError(slug) {
  if (!slug) return "Enter a URL for the post.";
  if (slug.length > BLOG_SLUG_MAX) return `The URL can be up to ${BLOG_SLUG_MAX} characters.`;
  if (!SLUG_PATTERN.test(slug)) return "Use lowercase letters, numbers and single hyphens only.";
  return null;
}

const text = (value) => (typeof value === "string" ? value.trim() : "");

// Tags arrive as a comma (or line) separated string from the form or as an array from
// the API. Blank and repeated tags (ignoring case) are dropped, the first spelling wins.
export function parseTags(value) {
  const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,\n]/) : [];
  const seen = new Set();
  const tags = [];
  for (const item of list) {
    const tag = typeof item === "string" ? item.trim().replace(/\s+/g, " ") : "";
    if (!tag || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    tags.push(tag);
  }
  return tags;
}

// Today's date in UTC as YYYY-MM-DD (the date column is compared in UTC).
export const todayIso = () => new Date().toISOString().slice(0, 10);

function isRealDate(value) {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  if (year < 2000 || year > 2100) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// "2026-07-01" -> "01 July 2026" (the format the old store showed), in UTC so the
// day never shifts with the visitor's time zone. Returns "" for no or a bad date.
export function formatBlogDate(isoDate) {
  if (!isoDate || !isRealDate(isoDate)) return "";
  const date = new Date(`${isoDate}T00:00:00Z`);
  return `${String(date.getUTCDate()).padStart(2, "0")} ${date.toLocaleString("en-US", { month: "long", timeZone: "UTC" })} ${date.getUTCFullYear()}`;
}

// A picture is a path on this site or an https address.
const isImageUrl = (value) => /^\/(?!\/)/.test(value) || /^https:\/\//i.test(value);

/**
 * Reads the editable fields of a post out of a request body or form state.
 * Returns { values, errors }: `errors` is keyed by field and is empty when `values`
 * is safe to save. `publishedOn` is null when it was left blank; the server then uses
 * today's date when the post is published.
 */
export function normalizeBlogPostInput(input) {
  const body = input && typeof input === "object" ? input : {};
  const errors = {};

  const title = text(body.title);
  if (!title) errors.title = "Enter a post title.";
  else if (title.length > BLOG_TITLE_MAX) errors.title = `The title can be up to ${BLOG_TITLE_MAX} characters.`;

  const slug = text(body.slug).toLowerCase();
  const slugProblem = blogSlugError(slug);
  if (slugProblem) errors.slug = slugProblem;

  const excerpt = text(body.excerpt);
  if (excerpt.length > BLOG_EXCERPT_MAX) errors.excerpt = `The summary can be up to ${BLOG_EXCERPT_MAX} characters.`;

  const contentHtml = typeof body.contentHtml === "string" ? body.contentHtml : "";
  if (contentHtml.length > BLOG_CONTENT_MAX) {
    errors.contentHtml = `The post is too long. Keep it under ${BLOG_CONTENT_MAX.toLocaleString("en-US")} characters.`;
  }

  const category = text(body.category).replace(/\s+/g, " ");
  if (!category) errors.category = "Choose or enter a category.";
  else if (category.length > BLOG_CATEGORY_MAX) errors.category = `The category can be up to ${BLOG_CATEGORY_MAX} characters.`;
  else if (!categorySlugFor(category)) errors.category = "Use letters or numbers in the category name.";

  const author = text(body.author);
  if (author.length > BLOG_AUTHOR_MAX) errors.author = `The author can be up to ${BLOG_AUTHOR_MAX} characters.`;

  const tags = parseTags(body.tags);
  if (tags.length > BLOG_TAGS_MAX_COUNT) errors.tags = `Use up to ${BLOG_TAGS_MAX_COUNT} tags.`;
  else if (tags.some((tag) => tag.length > BLOG_TAG_MAX)) errors.tags = `Each tag can be up to ${BLOG_TAG_MAX} characters.`;

  const publishedOnText = text(body.publishedOn);
  let publishedOn = null;
  if (publishedOnText) {
    if (isRealDate(publishedOnText)) publishedOn = publishedOnText;
    else errors.publishedOn = "Enter a valid date.";
  }

  const featuredImageUrl = text(body.featuredImageUrl);
  if (featuredImageUrl) {
    if (featuredImageUrl.length > BLOG_IMAGE_URL_MAX) errors.featuredImageUrl = "That picture address is too long.";
    else if (!isImageUrl(featuredImageUrl)) errors.featuredImageUrl = "Choose a picture from the library or upload one.";
  }
  const featuredImageAlt = text(body.featuredImageAlt);
  if (featuredImageAlt.length > BLOG_IMAGE_ALT_MAX) errors.featuredImageAlt = `The picture description can be up to ${BLOG_IMAGE_ALT_MAX} characters.`;

  const seoTitle = text(body.seoTitle);
  if (seoTitle.length > BLOG_SEO_TITLE_MAX) errors.seoTitle = `The SEO title can be up to ${BLOG_SEO_TITLE_MAX} characters.`;
  const seoDescription = text(body.seoDescription);
  if (seoDescription.length > BLOG_SEO_DESCRIPTION_MAX) {
    errors.seoDescription = `The meta description can be up to ${BLOG_SEO_DESCRIPTION_MAX} characters.`;
  }

  const status = body.status === undefined || body.status === "" ? "draft" : body.status;
  if (!BLOG_STATUSES.some((option) => option.value === status)) errors.status = "Choose Published or Draft.";

  return {
    values: {
      title, slug, excerpt, contentHtml, category, categorySlug: categorySlugFor(category), author, tags,
      publishedOn, featuredImageUrl, featuredImageAlt, seoTitle, seoDescription, status,
    },
    errors,
  };
}

// Field order for focusing the first invalid control.
export const BLOG_FIELD_ORDER = [
  "title", "slug", "excerpt", "contentHtml", "featuredImageUrl", "featuredImageAlt", "category", "author",
  "tags", "publishedOn", "status", "seoTitle", "seoDescription",
];
