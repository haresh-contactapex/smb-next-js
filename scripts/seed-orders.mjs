// Seeds test dummy orders for the Orders module (All/Pending/Processing/
// Completed/Cancelled), so the listing pages and the sidebar's live
// per-status badges have something to show. Writes directly to Neon (same
// table as src/lib/orders.js) so it doesn't need a running dev server or an
// authenticated session — same pattern as scripts/seed-dummy-products.mjs.
//
// Usage: node scripts/seed-orders.mjs [count]

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

const FIRST_NAMES = [
  "Kavya", "Arjun", "Ishita", "Karan", "Meera", "Priya", "Rohan", "Ananya", "Vikram", "Sonal",
  "Devika", "Aditya", "Neha", "Siddharth", "Pooja", "Rahul", "Divya", "Manish", "Sneha", "Yash",
  "Tanvi", "Nikhil",
];
const LAST_NAMES = [
  "Reddy", "Malhotra", "Bose", "Kapoor", "Iyer", "Nair", "Kulkarni", "Shah", "Mehta", "Desai",
  "Menon", "Rao", "Gupta", "Joshi", "Varma", "Chawla", "Pillai", "Trivedi", "Saxena", "Agarwal",
  "Bhatt",
];

// More Completed than any other status, matching the spread already in the
// mock data this replaces.
const STATUS_CYCLE = ["Completed", "Pending", "Processing", "Completed", "Cancelled", "Processing", "Completed", "Pending"];

function pick(arr, i) {
  return arr[i % arr.length];
}

function paymentForStatus(status) {
  if (status === "Cancelled") return "Refunded";
  if (status === "Pending") return "Unpaid";
  return "Paid";
}

function buildOrder(index, runTag) {
  const status = pick(STATUS_CYCLE, index);
  const daysAgo = index % 45;
  const placedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

  return {
    order_number: `SMB-${runTag}${String(index).padStart(3, "0")}`,
    customer_name: `${pick(FIRST_NAMES, index)} ${pick(LAST_NAMES, index + 4)}`,
    item_count: 1 + (index % 4),
    total_amount: 15000 + (index % 40) * 2750,
    currency: "INR",
    status,
    payment_status: paymentForStatus(status),
    placed_at: placedAt,
    cancelled_at: status === "Cancelled" ? placedAt : null,
  };
}

async function main() {
  const count = parseInt(process.argv[2], 10) || 30;
  const runTag = Date.now().toString(36).slice(-6);
  const orders = Array.from({ length: count }, (_, i) => buildOrder(i, runTag));

  await batchInsert(
    "orders",
    [
      "order_number", "customer_name", "item_count", "total_amount", "currency",
      "status", "payment_status", "placed_at", "cancelled_at",
    ],
    orders.map((o) => [
      o.order_number, o.customer_name, o.item_count, o.total_amount, o.currency,
      o.status, o.payment_status, o.placed_at, o.cancelled_at,
    ])
  );

  const counts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});
  console.log(`Seeded ${orders.length} dummy orders (run tag ${runTag}).`);
  console.log("By status:", counts);
  console.log(`Run tag: ${runTag} — filter order_number LIKE 'SMB-${runTag}%' to find/remove this batch later.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
