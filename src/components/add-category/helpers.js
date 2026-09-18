export function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
export const MAX_IMAGE_SIZE_MB = 5;

export function validateImageFile(file) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Only JPG, PNG, and WEBP images are allowed";
  }
  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    return `Image must be smaller than ${MAX_IMAGE_SIZE_MB}MB`;
  }
  return null;
}

export const DEFAULT_CATEGORY = {
  title: "",
  description: "",
  image: null,
  parentCategory: "none",
  themeTemplate: "default",
  visible: true,
  seoTitle: "",
  seoDescription: "",
  handle: "",
  handleTouched: false,
};

// Excludes the category itself and any of its descendants from a parent
// picker, so a category can't be reparented under its own subtree.
export function excludeDescendants(categories, categoryId) {
  if (!categoryId) return categories;
  const excluded = new Set([categoryId]);
  let added = true;
  while (added) {
    added = false;
    for (const cat of categories) {
      if (excluded.has(cat.parentId) && !excluded.has(cat.id)) {
        excluded.add(cat.id);
        added = true;
      }
    }
  }
  return categories.filter((cat) => !excluded.has(cat.id));
}

export function buildCategoryFromData(data) {
  return {
    title: data.name || "",
    description: data.description || "",
    image: data.imageUrl ? { url: data.imageUrl, name: "" } : null,
    parentCategory: data.parentId || "none",
    themeTemplate: data.themeTemplate || "default",
    visible: data.visible ?? true,
    seoTitle: data.seoTitle || "",
    seoDescription: data.seoDescription || "",
    handle: data.slug || "",
    handleTouched: true,
  };
}

export function assembleCategory(category) {
  return {
    name: category.title.trim(),
    slug: category.handle.trim() || slugify(category.title),
    description: category.description || "",
    imageUrl: category.image?.url || null,
    parentId: category.parentCategory === "none" ? null : category.parentCategory,
    themeTemplate: category.themeTemplate,
    visible: category.visible,
    seoTitle: category.seoTitle || "",
    seoDescription: category.seoDescription || "",
  };
}
