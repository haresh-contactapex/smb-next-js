// Seeds 50 dummy products covering four shapes of the catalog aggregate:
//   1. simple      — no options/variants, no attributes
//   2. full        — options+variants AND custom attributes
//   3. variants-only — options+variants, no attributes
//   4. attributes-only — no options/variants, custom attributes only
// Writes directly to Neon (same tables/shape as src/lib/products.js) so it
// doesn't need a running dev server or an authenticated session — same
// pattern as scripts/migrate.mjs and scripts/create-admin-user.mjs.
//
// Usage: node scripts/seed-dummy-products.mjs

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { neon } from "@neondatabase/serverless";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  let contents;
  try {
    contents = readFileSync(envPath, "utf8");
  } catch {
    return;
  }
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) continue;
    const [, key, rawValue = ""] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^(['"])(.*)\1$/, "$2");
  }
}
loadEnvLocal();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Add it to your .env.local file.");
}
const sql = neon(process.env.DATABASE_URL);

function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function batchInsert(table, columns, rows, returning) {
  if (!rows.length) return [];
  const valueGroups = [];
  const params = [];
  let p = 1;
  for (const row of rows) {
    valueGroups.push(`(${row.map(() => `$${p++}`).join(", ")})`);
    params.push(...row);
  }
  const text = `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${valueGroups.join(", ")}${
    returning ? ` RETURNING ${returning}` : ""
  }`;
  return sql.query(text, params);
}

// --- Fixed dataset (existing, real categories — reused by id so this never
// creates duplicate category rows) -----------------------------------------
const CATEGORY_IDS = [
  "3ba650a6-b309-4e8b-a91f-91a3c82043c1", // Jewelry > Rings > Men's Bands
  "47f557a1-8967-4ab3-b005-718ce600116f", // Jewelry > Rings > Men's Classic Wedding Bands
  "f64c7c9d-1467-497d-83b1-ce0b7220665d", // Jewelry > Rings > Women's Classic Wedding Bands
  "abbba308-6422-49fd-a445-bfe2d460e7aa", // Accessories > Gift Boxes
  "118193ee-4ba8-4ce2-8e7a-bf264df2bfcc", // Jewelry
  "fe3fd861-0aac-4275-8bfe-ea61405fcaaf", // Jewelry > Rings
];

const IMAGES = [
  "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338",
  "https://images.unsplash.com/photo-1611652022419-a9419f74343d",
  "https://images.unsplash.com/photo-1584302179602-e4c3d3fd629d",
  "https://images.unsplash.com/photo-1620656798579-1284aeb50e63",
  "https://images.unsplash.com/photo-1596944924616-7b38e7cfac36",
  "https://images.unsplash.com/photo-1599643477877-530eb83abc8e",
];

const ATTRIBUTE_POOL = [
  ["Material", "18K Gold"],
  ["Material", "925 Sterling Silver"],
  ["Material", "Platinum"],
  ["Gemstone", "Diamond, 0.5ct"],
  ["Gemstone", "Sapphire"],
  ["Finish", "Polished"],
  ["Finish", "Matte"],
  ["Setting Type", "Prong"],
  ["Country of Origin", "India"],
  ["Warranty", "Lifetime warranty"],
  ["Care Instructions", "Avoid contact with perfume and harsh chemicals."],
  ["Occasion", "Wedding"],
  ["Gender", "Unisex"],
  ["Certification", "GIA-certified"],
];

const NAME_WORDS = [
  "Classic",
  "Vintage",
  "Modern",
  "Eternity",
  "Solitaire",
  "Twisted",
  "Brushed",
  "Hammered",
  "Halo",
  "Infinity",
  "Signature",
  "Heritage",
  "Radiant",
  "Timeless",
];
const NAME_ITEMS = ["Ring", "Band", "Necklace", "Bracelet", "Earrings", "Pendant", "Chain", "Cufflinks", "Anklet"];

const COLOR_VALUES = ["14K White Gold", "14K Yellow Gold", "Rose Gold"];
const SIZE_VALUES = ["6", "7", "8"];

function pick(arr, i) {
  return arr[i % arr.length];
}

function shortSku(prefix, i) {
  return `${prefix}${String(i).padStart(3, "0")}`;
}

function buildProduct(scenario, index, runTag) {
  const name = `${pick(NAME_WORDS, index)} ${pick(NAME_ITEMS, index + 3)}`;
  const title = `${name} #${index + 1}`;
  const handle = slugify(`${title}-${runTag}`);
  const categoryId = pick(CATEGORY_IDS, index);
  const basePrice = 1500 + (index % 20) * 350;
  const sku = shortSku(`SEED${runTag}`, index);

  const hasVariants = scenario === "full" || scenario === "variants-only";
  const hasAttributes = scenario === "full" || scenario === "attributes-only";

  const options = hasVariants
    ? [
        { name: "Color", values: [...COLOR_VALUES] },
        { name: "Size", values: [...SIZE_VALUES] },
      ]
    : [];

  const attributes = hasAttributes
    ? [ATTRIBUTE_POOL[index % ATTRIBUTE_POOL.length], ATTRIBUTE_POOL[(index + 5) % ATTRIBUTE_POOL.length]]
    : [];

  return {
    title,
    handle,
    body_html: `<p>${title} — seeded dummy product (${scenario}).</p>`,
    category_id: categoryId,
    product_type: "Jewelry",
    status: index % 7 === 0 ? "DRAFT" : "ACTIVE",
    price: basePrice,
    compare_at_price: index % 4 === 0 ? basePrice + 500 : null,
    cost_per_item: Math.round(basePrice * 0.55),
    charge_tax: true,
    track_quantity: true,
    sku,
    barcode: null,
    is_physical_product: true,
    weight: 12.5,
    weight_unit: "g",
    hs_code: null,
    seo_title: null,
    seo_description: null,
    media: [{ type: "image", url: pick(IMAGES, index), name: `${handle}.jpg` }],
    options,
    attributes: attributes.map(([label, value]) => ({ label, value })),
    scenario,
  };
}

function cartesian(a, b) {
  return a.flatMap((x) => b.map((y) => [x, y]));
}

async function insertProduct(payload) {
  const [created] = await sql`
    INSERT INTO products (
      title, handle, description, category_id, product_type, status, price, compare_at_price,
      cost_per_item, charge_tax, track_quantity, sku, barcode, is_physical_product, weight,
      weight_unit, hs_code, seo_title, seo_description
    ) VALUES (
      ${payload.title}, ${payload.handle}, ${payload.body_html}, ${payload.category_id},
      ${payload.product_type}, ${payload.status}, ${payload.price}, ${payload.compare_at_price},
      ${payload.cost_per_item}, ${payload.charge_tax}, ${payload.track_quantity}, ${payload.sku},
      ${payload.barcode}, ${payload.is_physical_product}, ${payload.weight}, ${payload.weight_unit},
      ${payload.hs_code}, ${payload.seo_title}, ${payload.seo_description}
    )
    RETURNING id
  `;
  const productId = created.id;

  await batchInsert(
    "product_media",
    ["product_id", "type", "url", "name"],
    payload.media.map((m) => [productId, m.type, m.url, m.name])
  );

  if (payload.attributes.length) {
    await batchInsert(
      "product_attributes",
      ["product_id", "label", "value", "position"],
      payload.attributes.map((a, i) => [productId, a.label, a.value, i])
    );
  }

  if (payload.options.length) {
    const optionRows = await batchInsert(
      "product_options",
      ["product_id", "name", "position"],
      payload.options.map((o, i) => [productId, o.name, i]),
      "id"
    );
    const valueIdByOptionValue = {}; // "Color:14K White Gold" -> id
    for (let oi = 0; oi < payload.options.length; oi++) {
      const option = payload.options[oi];
      const valueRows = await batchInsert(
        "product_option_values",
        ["option_id", "value", "position"],
        option.values.map((v, vi) => [optionRows[oi].id, v, vi]),
        "id"
      );
      option.values.forEach((v, vi) => {
        valueIdByOptionValue[`${option.name}:${v}`] = valueRows[vi].id;
      });
    }

    const combos = cartesian(COLOR_VALUES, SIZE_VALUES);
    const variantRows = await batchInsert(
      "product_variants",
      ["product_id", "sku", "price", "inventory_quantity", "inventory_management", "weight", "weight_unit"],
      combos.map(([color, size], i) => [
        productId,
        `${payload.sku}-${i + 1}`,
        payload.price,
        10 + i,
        true,
        payload.weight,
        payload.weight_unit,
      ]),
      "id"
    );

    const vovTuples = [];
    combos.forEach(([color, size], i) => {
      vovTuples.push([variantRows[i].id, valueIdByOptionValue[`Color:${color}`]]);
      vovTuples.push([variantRows[i].id, valueIdByOptionValue[`Size:${size}`]]);
    });
    await batchInsert("variant_option_values", ["variant_id", "option_value_id"], vovTuples);
  }

  return productId;
}

async function main() {
  const runTag = Date.now().toString(36).slice(-6);
  const plan = [
    ...Array.from({ length: 13 }, (_, i) => ["simple", i]),
    ...Array.from({ length: 13 }, (_, i) => ["full", i]),
    ...Array.from({ length: 12 }, (_, i) => ["variants-only", i]),
    ...Array.from({ length: 12 }, (_, i) => ["attributes-only", i]),
  ];

  console.log(`Seeding ${plan.length} dummy products (run tag ${runTag})...`);
  const created = [];
  let globalIndex = 0;
  for (const [scenario, i] of plan) {
    globalIndex += 1;
    const payload = buildProduct(scenario, globalIndex, runTag);
    const id = await insertProduct(payload);
    created.push({ id, scenario, title: payload.title });
    process.stdout.write(`  [${globalIndex}/${plan.length}] ${scenario.padEnd(16)} ${payload.title}\n`);
  }

  const counts = created.reduce((acc, p) => {
    acc[p.scenario] = (acc[p.scenario] || 0) + 1;
    return acc;
  }, {});
  console.log("\nDone. Created:", counts, `(total ${created.length})`);
  console.log(`Run tag: ${runTag} — filter handles/SKUs containing this tag to find/remove this batch later.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
