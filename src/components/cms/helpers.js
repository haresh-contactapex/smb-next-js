import { CMS_FOOTER_GROUPS } from "@/lib/cmsRules";

export const STATUS_BADGE_CLASSES = {
  published: "bg-success/10 text-success",
  draft: "bg-warning/10 text-warning",
};

export const STATUS_LABELS = { published: "Published", draft: "Draft" };

export function footerGroupLabel(value) {
  return CMS_FOOTER_GROUPS.find((group) => group.value === value)?.label || "Not in footer";
}

export const publicPath = (slug) => `/${slug}`;

export function formatDateTime(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function formatSize(characters) {
  if (characters < 1000) return `${characters} characters`;
  return `${(characters / 1000).toFixed(1)}k characters`;
}

// A new page starts as a draft. `slugTouched` stops the URL following the title
// once the staff member has typed their own.
export const EMPTY_PAGE = {
  title: "",
  slug: "",
  slugTouched: false,
  contentHtml: "",
  seoTitle: "",
  seoDescription: "",
  status: "draft",
  footerGroup: "",
  footerLabel: "",
  position: "",
};

export function pageToForm(page) {
  return {
    title: page.title,
    slug: page.slug,
    slugTouched: true,
    contentHtml: page.contentHtml,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    status: page.status,
    footerGroup: page.footerGroup,
    footerLabel: page.footerLabel,
    position: String(page.position),
  };
}

export function formToPayload(form) {
  return {
    title: form.title,
    slug: form.slug,
    contentHtml: form.contentHtml,
    seoTitle: form.seoTitle,
    seoDescription: form.seoDescription,
    status: form.status,
    footerGroup: form.footerGroup,
    footerLabel: form.footerLabel,
    position: form.position,
  };
}
