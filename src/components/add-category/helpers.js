export function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const DEFAULT_CATEGORY = {
  title: "",
  description: "",
  image: null,
  parentCategory: "none",
  themeTemplate: "default",
  seoTitle: "",
  seoDescription: "",
  handle: "",
  handleTouched: false,
};
