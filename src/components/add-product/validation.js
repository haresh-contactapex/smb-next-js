import { isMissingUpload, stripHtml, toNumber } from "./helpers";

// What the Add Product form insists on before it lets a product be saved. These are the form's
// completeness rules (a description, a category, an image, a SKU); the integrity rules the server
// enforces on every save live in @/lib/shared/product. No React: the form decides how to show a
// problem (focus, scroll, a red outline, a toast).

// The first thing wrong with `product`, in the order the page lays the fields out, or null when it
// can be saved. `field` names where it is:
//   title | category | description | media | mediaMissing | price | sku | variants | variantImages
// `variantRowErrors` (one { price, quantity } per variant) is returned for the "variants" problem.
export function findProductProblem(product, { formatMoney = (amount) => String(amount) } = {}) {
  const variantRowErrors = product.variants.map((variant) => ({
    price: !variant.price || toNumber(variant.price) <= 0,
    quantity: String(variant.inventory_quantity).trim() === "",
  }));

  const checks = [
    ["title", !product.title.trim(), "Add a title before saving"],
    ["category", product.categories.length === 0, "Add at least one product category before saving"],
    ["description", !stripHtml(product.body_html).trim(), "Add a description before saving"],
    ["media", product.media.length === 0, "Add at least one image, video, or 3D model before saving"],
    [
      "mediaMissing",
      product.media.some(isMissingUpload),
      "Some media files were never uploaded — remove the items marked “Missing” and upload them again",
    ],
    ["price", !product.price || toNumber(product.price) <= 0, `Enter a price greater than ${formatMoney(0)} before saving`],
    ["sku", !product.sku.trim(), "Add a SKU before saving"],
    ["variants", variantRowErrors.some((row) => row.price || row.quantity), "Add a price and quantity for every variant before saving"],
    [
      "variantImages",
      product.variants.some((variant) => isMissingUpload(variant.image)),
      "Some variant images were never uploaded — remove or replace the images marked missing",
    ],
  ];

  const failed = checks.find(([, invalid]) => invalid);
  return failed ? { field: failed[0], message: failed[2], variantRowErrors } : null;
}
