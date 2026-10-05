import { listProducts, getProductById } from "./products";

const MAX_OPTION_DIMENSIONS = 3;

// Same column set src/lib/productImport.js reads — a file exported here can
// be re-imported unchanged, including variable products (see
// docs/category-product/workflow.md's "Import Products (CSV)" section for
// the shared column contract).
const BASE_CSV_COLUMNS = [
  "handle",
  "title",
  "sku",
  "price",
  "compare_at_price",
  "cost_per_item",
  "barcode",
  "description",
  "category",
  "product_type",
  "tags",
  "collections",
  "status",
  "charge_tax",
  "track_quantity",
  "physical_product",
  "weight",
  "weight_unit",
  "hs_code",
  "image_url",
  "seo_title",
  "seo_description",
  "option1_name",
  "option1_value",
  "option2_name",
  "option2_value",
  "option3_name",
  "option3_value",
  "variant_sku",
  "variant_price",
  "variant_compare_at_price",
  "variant_inventory_quantity",
  "variant_weight",
  "variant_weight_unit",
  "variant_image_url",
];

// attribute1_label, attribute1_value, attribute2_label, ... — sized to the
// product with the most attributes (never fewer than one pair, so the columns
// are always visible), appended after the fixed columns so existing column
// positions don't shift.
function buildCsvColumns(attributeCount) {
  const attributeColumns = [];
  for (let n = 1; n <= attributeCount; n++) {
    attributeColumns.push(`attribute${n}_label`, `attribute${n}_value`);
  }
  return [...BASE_CSV_COLUMNS, ...attributeColumns];
}

function toCsvField(value) {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function rowToCsvLine(columns, rowFields) {
  return columns.map((col) => toCsvField(rowFields[col])).join(",");
}

function productLevelFields(product) {
  const attributeFields = {};
  product.attributes.forEach((attribute, i) => {
    attributeFields[`attribute${i + 1}_label`] = attribute.label;
    attributeFields[`attribute${i + 1}_value`] = attribute.value;
  });

  return {
    ...attributeFields,
    handle: product.handle,
    title: product.title,
    sku: product.sku,
    price: product.price,
    compare_at_price: product.compare_at_price,
    cost_per_item: product.cost_per_item,
    barcode: product.barcode,
    description: product.body_html,
    category: product.category,
    product_type: product.product_type,
    tags: product.tags.join(";"),
    collections: product.collections.join(";"),
    status: product.status,
    charge_tax: product.charge_tax ? "true" : "false",
    track_quantity: product.track_quantity ? "true" : "false",
    physical_product: product.physical_product ? "true" : "false",
    weight: product.weight,
    weight_unit: product.weight_unit,
    hs_code: product.hs_code,
    image_url: product.media
      .filter((m) => m.type === "image")
      .map((m) => m.url)
      .join(";"),
    seo_title: product.seo.title,
    seo_description: product.seo.description,
  };
}

// One product -> one CSV row (simple product) or one row per variant
// (variable product, all sharing `handle`) — the mirror image of
// buildOptionsAndVariants()/mapGroupToProductPayload() in productImport.js.
function buildRowsForProduct(product) {
  const base = productLevelFields(product);

  if (!product.variants.length) {
    return [base];
  }

  // Assigns option1/option2/option3 by the product's own option order
  // (product.options is ORDER BY position), not by iterating each variant's
  // own options object — getProductById's variant-option-values query has no
  // ORDER BY, so that per-variant key order isn't reliably the same from one
  // variant to the next and would otherwise make option1 mean a different
  // option on different rows of the same product.
  const orderedOptionNames = product.options.slice(0, MAX_OPTION_DIMENSIONS).map((o) => o.name);

  return product.variants.map((variant, i) => {
    const dims = {};
    orderedOptionNames.forEach((name, d) => {
      if (!(name in (variant.options || {}))) return;
      dims[`option${d + 1}_name`] = name;
      dims[`option${d + 1}_value`] = variant.options[name];
    });

    return {
      // Only the first variant row repeats the product-level columns —
      // every other row just carries `handle` so the importer groups them
      // back into one product.
      ...(i === 0 ? base : { handle: base.handle }),
      ...dims,
      variant_sku: variant.sku,
      variant_price: variant.price,
      variant_compare_at_price: variant.compare_at_price,
      variant_inventory_quantity: variant.inventory_quantity,
      variant_weight: variant.weight,
      variant_weight_unit: variant.weight_unit,
      variant_image_url: variant.image?.url || "",
    };
  });
}

export async function exportProductsToCsv() {
  const summaries = await listProducts();
  const productRows = [];
  let attributeCount = 1;

  for (const summary of summaries) {
    const product = await getProductById(summary.id);
    if (!product) continue;
    attributeCount = Math.max(attributeCount, product.attributes.length);
    productRows.push(...buildRowsForProduct(product));
  }

  const columns = buildCsvColumns(attributeCount);
  const lines = [columns.join(","), ...productRows.map((row) => rowToCsvLine(columns, row))];

  return lines.join("\r\n") + "\r\n";
}
