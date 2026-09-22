// Column contract mirrors src/lib/productImport.js's mapGroupToProductPayload
// / buildOptionsAndVariants — keep the two in sync when adding/renaming a
// supported column.
export const REQUIRED_COLUMNS = ["title", "sku", "price"];
export const OPTIONAL_COLUMNS = [
  "handle",
  "description",
  "category",
  "product_type",
  "tags",
  "collections",
  "compare_at_price",
  "cost_per_item",
  "barcode",
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
];
export const VARIANT_COLUMNS = [
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

const TEMPLATE_HEADER = [...REQUIRED_COLUMNS, "description", "category", "tags", "status", "image_url"];
const TEMPLATE_ROW = [
  "Rose Gold Eternity Band",
  "RGB-001",
  "129.99",
  "An elegant rose gold eternity band with a continuous row of pave-set diamonds.",
  "Jewelry > Rings",
  "bestseller;gold",
  "active",
  "https://example.com/images/rgb-001.jpg",
];

// A variable product spans several rows that share the same `handle`. Only
// the first row carries the product-level columns (title, sku, price,
// description, ...); every row carries its own option/variant columns —
// mirrors the grouping rule in groupRowsByProduct().
const VARIABLE_TEMPLATE_HEADER = [
  "handle",
  "title",
  "sku",
  "price",
  "description",
  "category",
  "tags",
  "status",
  "image_url",
  "option1_name",
  "option1_value",
  "option2_name",
  "option2_value",
  "variant_sku",
  "variant_price",
  "variant_compare_at_price",
  "variant_inventory_quantity",
  "variant_image_url",
];
const VARIABLE_TEMPLATE_ROWS = [
  [
    "classic-crew-tshirt",
    "Classic Crew T-Shirt",
    "TSHIRT-001",
    "24.99",
    "A soft, everyday cotton crew-neck tee.",
    "Apparel > T-Shirts",
    "bestseller;cotton",
    "active",
    "https://example.com/images/tshirt-black.jpg",
    "Color",
    "Black",
    "Size",
    "S",
    "TSHIRT-001-BLK-S",
    "24.99",
    "29.99",
    "25",
    "https://example.com/images/tshirt-black.jpg",
  ],
  [
    "classic-crew-tshirt",
    "", "", "", "", "", "", "", "",
    "Color",
    "Black",
    "Size",
    "M",
    "TSHIRT-001-BLK-M",
    "24.99",
    "29.99",
    "18",
    "https://example.com/images/tshirt-black.jpg",
  ],
  [
    "classic-crew-tshirt",
    "", "", "", "", "", "", "", "",
    "Color",
    "White",
    "Size",
    "S",
    "TSHIRT-001-WHT-S",
    "24.99",
    "29.99",
    "30",
    "https://example.com/images/tshirt-white.jpg",
  ],
  [
    "classic-crew-tshirt",
    "", "", "", "", "", "", "", "",
    "Color",
    "White",
    "Size",
    "M",
    "TSHIRT-001-WHT-M",
    "24.99",
    "29.99",
    "20",
    "https://example.com/images/tshirt-white.jpg",
  ],
];

function toCsvField(value) {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function toCsvRow(values) {
  return values.map(toCsvField).join(",");
}

export function buildSampleCsv() {
  return [toCsvRow(TEMPLATE_HEADER), toCsvRow(TEMPLATE_ROW)].join("\r\n") + "\r\n";
}

export function buildVariableSampleCsv() {
  return [toCsvRow(VARIABLE_TEMPLATE_HEADER), ...VARIABLE_TEMPLATE_ROWS.map(toCsvRow)].join("\r\n") + "\r\n";
}

export function buildFailedRowsCsv(failedRows) {
  const header = ["row", "title", "sku", "error"];
  const lines = failedRows.map((f) => toCsvRow([f.row, f.title, f.sku, f.error]));
  return [toCsvRow(header), ...lines].join("\r\n") + "\r\n";
}

export function downloadCsv(filename, csvText) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
