import { parseTags, todayIso } from "@/lib/blogRules";

// The date and size formatting is the CMS editor's (same version history, same list wording).
export { formatDateTime, formatSize } from "@/components/cms/helpers";

export const STATUS_BADGE_CLASSES = {
  published: "bg-success/10 text-success",
  scheduled: "bg-info/10 text-info",
  draft: "bg-warning/10 text-warning",
};

export const STATUS_LABELS = { published: "Published", scheduled: "Scheduled", draft: "Draft" };

// What the list shows and filters by: a published post dated in the future is
// "scheduled" (the storefront only shows it from that date).
export const STATUS_FILTER_OPTIONS = [
  { value: "published", label: "Published" },
  { value: "scheduled", label: "Scheduled" },
  { value: "draft", label: "Draft" },
];

export function displayStatus(post, today = todayIso()) {
  if (post.status === "published" && post.publishedOn && post.publishedOn > today) return "scheduled";
  return post.status;
}

// A new post starts as a draft. `slugTouched` stops the URL following the title
// once the staff member has typed their own. `tags` is one comma separated string.
export const EMPTY_POST = {
  title: "",
  slug: "",
  slugTouched: false,
  excerpt: "",
  contentHtml: "",
  featuredImageUrl: "",
  featuredImageAlt: "",
  category: "",
  author: "",
  tags: "",
  publishedOn: "",
  seoTitle: "",
  seoDescription: "",
  status: "draft",
};

export function postToForm(post) {
  return {
    title: post.title,
    slug: post.slug,
    slugTouched: true,
    excerpt: post.excerpt,
    contentHtml: post.contentHtml,
    featuredImageUrl: post.featuredImageUrl,
    featuredImageAlt: post.featuredImageAlt,
    category: post.category,
    author: post.author,
    tags: parseTags(post.tags).join(", "),
    publishedOn: post.publishedOn,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    status: post.status,
  };
}

export function formToPayload(form) {
  return {
    title: form.title,
    slug: form.slug,
    excerpt: form.excerpt,
    contentHtml: form.contentHtml,
    featuredImageUrl: form.featuredImageUrl,
    featuredImageAlt: form.featuredImageAlt,
    category: form.category,
    author: form.author,
    tags: form.tags,
    publishedOn: form.publishedOn,
    seoTitle: form.seoTitle,
    seoDescription: form.seoDescription,
    status: form.status,
  };
}
