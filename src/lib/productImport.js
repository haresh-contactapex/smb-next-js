import Papa from "papaparse";
import { createProduct, slugify } from "./products";

// Guards against a pathological upload turning into thousands of sequential
// createProduct() calls (each of which is itself several round trips) —
// keeps one import request inside a reasonable serverless execution window.
export const IMPORT_MAX_ROWS = 2000;

const REQUIRED_COLUMNS = ["title", "sku", "price"];
const VALID_STATUSES = new Set(["ACTIVE", "DRAFT", "ARCHIVED"]);
const VALID_WEIGHT_UNITS = new Set(["kg", "g", "lb", "oz"]);
const MAX_OPTION_DIMENSIONS = 3;

function splitList(value) {
  return String(value || "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseRequiredNumber(value, field, errors) {
  const str = String(value ?? "").trim();
  if (!str) {
    errors.push(`${field} is required`);
    return null;
  }
  const n = Number(str);
  if (Number.isNaN(n) || n < 0) {
    errors.push(`${field} must be a non-negative number`);
    return null;
  }
  return n;
}

function parseOptionalNumber(value, field, errors) {
  const str = String(value ?? "").trim();
  if (!str) return null;
  const n = Number(str);
  if (Number.isNaN(n) || n < 0) {
    errors.push(`${field} must be a non-negative number`);
    return null;
  }
  return n;
}

function parseBool(value, fallback) {
  const str = String(value ?? "").trim().toLowerCase();
  if (!str) return fallback;
  return ["true", "1", "yes"].includes(str);
}

function parseWeightUnit(value, field, errors) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (!VALID_WEIGHT_UNITS.has(raw)) {
    errors.push(`${field} must be one of kg, g, lb, oz (got "${value}")`);
    return "";
  }
  return raw;
}

// Splits the raw CSV text into header-mapped row objects. Column names are
// lowercased/underscored (" Compare At Price " -> "compare_at_price") so the
// template and hand-edited exports both work regardless of casing/spacing.
function parseProductCsv(csvText) {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
  });

  if (result.errors?.length) {
    const first = result.errors[0];
    throw new Error(`Could not parse the CSV file: ${first.message} (row ${first.row + 2})`);
  }

  const fields = result.meta?.fields || [];
  const missing = REQUIRED_COLUMNS.filter((col) => !fields.includes(col));
  if (missing.length) {
    throw new Error(`The CSV is missing required column(s): ${missing.join(", ")}`);
  }

  return result.data;
}

// Groups parsed rows into one entry per product. Rows that share a non-empty
// `handle` belong to the same (variable) product — one row per variant, in
// the style of a Shopify product CSV. A row with no `handle` is its own
// (simple) product keyed by slugify(title), which keeps a plain one-row-per-
// product CSV (no `handle` column at all) working exactly as before.
function groupRowsByProduct(rows) {
  const groups = [];
  const groupIndexByHandle = new Map();

  rows.forEach((row, i) => {
    const rowNumber = i + 2; // +1 for 0-index, +1 for the header row
    const handle = String(row.handle || "").trim();

    if (handle && groupIndexByHandle.has(handle)) {
      groups[groupIndexByHandle.get(handle)].rows.push({ row, rowNumber });
      return;
    }

    const groupIndex = groups.length;
    if (handle) groupIndexByHandle.set(handle, groupIndex);
    groups.push({ rows: [{ row, rowNumber }] });
  });

  return groups;
}

function isVariantRow(row) {
  return Boolean(String(row.option1_name || "").trim());
}

// Builds `options` (the distinct name -> ordered values used across the
// group's rows) and `variants` (one per row) from a variable product's rows.
function buildOptionsAndVariants(groupRows, defaultWeightUnit, errors) {
  const optionValuesByName = new Map();
  const variants = [];

  groupRows.forEach(({ row, rowNumber }) => {
    const optionEntries = [];
    for (let d = 1; d <= MAX_OPTION_DIMENSIONS; d++) {
      const name = String(row[`option${d}_name`] || "").trim();
      const value = String(row[`option${d}_value`] || "").trim();
      if (!name) continue;
      if (!value) {
        errors.push(`row ${rowNumber}: option${d}_value is required when option${d}_name is set`);
        continue;
      }
      optionEntries.push([name, value]);
      if (!optionValuesByName.has(name)) optionValuesByName.set(name, []);
      const values = optionValuesByName.get(name);
      if (!values.includes(value)) values.push(value);
    }

    const variantSku = String(row.variant_sku || "").trim();
    if (!variantSku) errors.push(`row ${rowNumber}: variant_sku is required for a variant row`);

    const variantPrice = parseRequiredNumber(row.variant_price, `row ${rowNumber}: variant_price`, errors);
    const variantCompareAtPrice = parseOptionalNumber(
      row.variant_compare_at_price,
      `row ${rowNumber}: variant_compare_at_price`,
      errors
    );
    const variantWeight = parseOptionalNumber(row.variant_weight, `row ${rowNumber}: variant_weight`, errors);
    const variantWeightUnit = parseWeightUnit(row.variant_weight_unit, `row ${rowNumber}: variant_weight_unit`, errors);

    const qtyRaw = String(row.variant_inventory_quantity ?? "").trim();
    let variantQuantity = 0;
    if (qtyRaw) {
      const n = Number(qtyRaw);
      if (Number.isNaN(n) || n < 0) {
        errors.push(`row ${rowNumber}: variant_inventory_quantity must be a non-negative number`);
      } else {
        variantQuantity = n;
      }
    }

    const variantImageUrl = String(row.variant_image_url || "").trim();

    variants.push({
      options: Object.fromEntries(optionEntries),
      price: variantPrice ?? "",
      compare_at_price: variantCompareAtPrice ?? "",
      sku: variantSku,
      inventory_quantity: variantQuantity,
      inventory_management: true,
      weight: variantWeight ?? "",
      weight_unit: variantWeightUnit || defaultWeightUnit,
      image: variantImageUrl ? { url: variantImageUrl, name: null } : null,
    });
  });

  const options = [...optionValuesByName.entries()].map(([name, values]) => ({ name, values }));
  return { options, variants };
}

// Maps one product group (its rows, already validated to share a handle) to
// the same nested payload shape `createProduct` expects (mirrors
// assembleProduct() in components/add-product/helpers.js). Every validation
// problem across the group's rows is collected and thrown together so a
// single bad product reports everything wrong with it in one pass.
function mapGroupToProductPayload(group) {
  const errors = [];
  const rows = group.rows;
  const firstRow = rows[0].row;
  const firstRowNumber = rows[0].rowNumber;

  const title = String(firstRow.title || "").trim();
  if (!title) errors.push(`row ${firstRowNumber}: title is required`);

  const sku = String(firstRow.sku || "").trim();
  if (!sku) errors.push(`row ${firstRowNumber}: sku is required`);

  const price = parseRequiredNumber(firstRow.price, `row ${firstRowNumber}: price`, errors);
  const compareAtPrice = parseOptionalNumber(firstRow.compare_at_price, "compare_at_price", errors);
  const costPerItem = parseOptionalNumber(firstRow.cost_per_item, "cost_per_item", errors);
  const weight = parseOptionalNumber(firstRow.weight, "weight", errors);

  const statusRaw = String(firstRow.status || "").trim().toUpperCase();
  const status = statusRaw || "ACTIVE";
  if (statusRaw && !VALID_STATUSES.has(status)) {
    errors.push(`status must be one of active, draft, archived (got "${firstRow.status}")`);
  }

  const weightUnitRaw = String(firstRow.weight_unit || "").trim().toLowerCase();
  const weightUnit = weightUnitRaw || "kg";
  if (weightUnitRaw && !VALID_WEIGHT_UNITS.has(weightUnit)) {
    errors.push(`weight_unit must be one of kg, g, lb, oz (got "${firstRow.weight_unit}")`);
  }

  const isVariable = rows.some(({ row }) => isVariantRow(row));
  let options = [];
  let variants = [];
  if (isVariable) {
    const built = buildOptionsAndVariants(rows, weightUnit, errors);
    options = built.options;
    variants = built.variants;
  }

  if (errors.length) {
    throw new Error(errors.join("; "));
  }

  const handle = slugify(firstRow.handle || title);
  const media = splitList(firstRow.image_url).map((url) => ({ type: "image", url, name: null }));

  return {
    title,
    body_html: String(firstRow.description || "").trim(),
    product_type: String(firstRow.product_type || "").trim(),
    category: String(firstRow.category || "").trim(),
    collections: splitList(firstRow.collections),
    tags: splitList(firstRow.tags),
    handle,
    status,
    pricing: {
      price,
      compare_at_price: compareAtPrice ?? "",
      charge_tax: parseBool(firstRow.charge_tax, true),
      cost_per_item: costPerItem ?? "",
    },
    inventory: {
      track_quantity: parseBool(firstRow.track_quantity, true),
      sku,
      barcode: String(firstRow.barcode || "").trim(),
    },
    shipping: {
      physical_product: parseBool(firstRow.physical_product, true),
      weight: weight ?? "",
      weight_unit: weightUnit,
      hs_code: String(firstRow.hs_code || "").trim(),
    },
    options,
    variants,
    seo: {
      title: String(firstRow.seo_title || "").trim(),
      description: String(firstRow.seo_description || "").trim(),
    },
    media,
  };
}

// Imports every product in a CSV, one createProduct() call at a time so each
// product gets the exact same validation/handle-uniqueness/rollback
// behavior as a product saved through the Add Product form. A bad product
// never aborts the rest of the file — it's recorded in `failed` and the
// import continues. Rows that share a `handle` are imported as one variable
// product (see groupRowsByProduct/buildOptionsAndVariants); every other row
// is its own simple, single-SKU product.
export async function importProductsFromCsv(csvText) {
  const rows = parseProductCsv(csvText);

  if (!rows.length) {
    throw new Error("The CSV file has no data rows.");
  }
  if (rows.length > IMPORT_MAX_ROWS) {
    throw new Error(`The CSV file has ${rows.length} rows; the import limit is ${IMPORT_MAX_ROWS} rows per file.`);
  }

  const groups = groupRowsByProduct(rows);
  const summary = { created: 0, failed: [] };

  for (const group of groups) {
    const firstRow = group.rows[0].row;
    const firstRowNumber = group.rows[0].rowNumber;
    try {
      const payload = mapGroupToProductPayload(group);
      await createProduct(payload);
      summary.created += 1;
    } catch (error) {
      summary.failed.push({
        row: firstRowNumber,
        title: firstRow.title ? String(firstRow.title).trim() : "",
        sku: firstRow.sku ? String(firstRow.sku).trim() : "",
        error: error.message,
      });
    }
  }

  return summary;
}
