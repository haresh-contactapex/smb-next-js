// Rules for CMS pages shared by the admin form and the server, so both reject the
// same input. No server imports: the client bundle uses this file too.
// See docs/cms/cms.md.

export const CMS_TITLE_MAX = 200;
export const CMS_SLUG_MAX = 100;
export const CMS_CONTENT_MAX = 200000;
export const CMS_SEO_TITLE_MAX = 200;
export const CMS_SEO_DESCRIPTION_MAX = 500;
export const CMS_FOOTER_LABEL_MAX = 100;
export const CMS_POSITION_MAX = 9999;

// Search engines show about this much; the form counts against it as guidance.
export const CMS_SEO_TITLE_ADVICE = 70;
export const CMS_SEO_DESCRIPTION_ADVICE = 160;

export const CMS_STATUSES = [
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
];

// The storefront footer columns a page can be listed in.
export const CMS_FOOTER_GROUPS = [
  { value: "customer-service", label: "Customer Service" },
  // `columns`: how many lists the footer lays the links out in (Education is two side by side on the live site).
  { value: "education", label: "Education", columns: 2 },
];

// A CMS page lives at /<slug>, so it must never shadow a route the storefront
// already has (or an area it reserves): the folders under src/app/(site), the
// customer auth pages, /admin, /api and the static folders.
export const RESERVED_SLUGS = new Set([
  "account", "admin", "api", "blog", "blogs", "cart", "checkout", "collections", "forgot-password", "login",
  "maintenance", "products", "register", "reset-password", "search", "storefront",
  "uploads", "wishlist", "women-wedding-bands",
]);

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, CMS_SLUG_MAX)
    .replace(/-$/, "");
}

export function slugError(slug) {
  if (!slug) return "Enter a URL for the page.";
  if (slug.length > CMS_SLUG_MAX) return `The URL can be up to ${CMS_SLUG_MAX} characters.`;
  if (!SLUG_PATTERN.test(slug)) return "Use lowercase letters, numbers and single hyphens only.";
  if (RESERVED_SLUGS.has(slug)) return `"${slug}" is used by the store itself. Choose another URL.`;
  return null;
}

const text = (value) => (typeof value === "string" ? value.trim() : "");

/**
 * Reads the editable fields of a page out of a request body or form state.
 * Returns { values, errors }: `errors` is keyed by field (title, slug,
 * contentHtml, seoTitle, seoDescription, status, footerGroup, footerLabel, position) and is
 * empty when `values` is safe to save. `position` is null when it was left blank,
 * and the server then puts the page last.
 */
export function normalizeCmsPageInput(input) {
  const body = input && typeof input === "object" ? input : {};
  const errors = {};

  const title = text(body.title);
  if (!title) errors.title = "Enter a page title.";
  else if (title.length > CMS_TITLE_MAX) errors.title = `The title can be up to ${CMS_TITLE_MAX} characters.`;

  const slug = text(body.slug).toLowerCase();
  const slugProblem = slugError(slug);
  if (slugProblem) errors.slug = slugProblem;

  const contentHtml = typeof body.contentHtml === "string" ? body.contentHtml : "";
  if (contentHtml.length > CMS_CONTENT_MAX) {
    errors.contentHtml = `The page is too long. Keep it under ${CMS_CONTENT_MAX.toLocaleString("en-US")} characters.`;
  }

  const seoTitle = text(body.seoTitle);
  if (seoTitle.length > CMS_SEO_TITLE_MAX) errors.seoTitle = `The SEO title can be up to ${CMS_SEO_TITLE_MAX} characters.`;
  const seoDescription = text(body.seoDescription);
  if (seoDescription.length > CMS_SEO_DESCRIPTION_MAX) {
    errors.seoDescription = `The meta description can be up to ${CMS_SEO_DESCRIPTION_MAX} characters.`;
  }

  const status = body.status === undefined || body.status === "" ? "draft" : body.status;
  if (!CMS_STATUSES.some((option) => option.value === status)) errors.status = "Choose Published or Draft.";

  const footerGroup = body.footerGroup ? body.footerGroup : null;
  if (footerGroup && !CMS_FOOTER_GROUPS.some((option) => option.value === footerGroup)) {
    errors.footerGroup = "Choose a footer column from the list.";
  }

  const footerLabel = text(body.footerLabel);
  if (footerLabel.length > CMS_FOOTER_LABEL_MAX) {
    errors.footerLabel = `The footer label can be up to ${CMS_FOOTER_LABEL_MAX} characters.`;
  }

  let position = null;
  if (body.position !== undefined && body.position !== null && String(body.position).trim() !== "") {
    const number = Number(body.position);
    if (!Number.isInteger(number) || number < 0 || number > CMS_POSITION_MAX) {
      errors.position = `Enter a whole number from 0 to ${CMS_POSITION_MAX}.`;
    } else {
      position = number;
    }
  }

  return {
    values: { title, slug, contentHtml, seoTitle, seoDescription, status, footerGroup, footerLabel, position },
    errors,
  };
}

// Field order for focusing the first invalid control.
export const CMS_FIELD_ORDER = ["title", "slug", "contentHtml", "seoTitle", "seoDescription", "status", "footerGroup", "footerLabel", "position"];
