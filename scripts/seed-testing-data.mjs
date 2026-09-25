// Seeds test/demo rows for Categories, Coupons, Customers and Staff Users so
// their listing pages have enough rows to exercise pagination, rows-per-page,
// and sorting. Writes directly to Neon (same tables/shape as the matching
// src/lib/*.js modules) — same pattern as scripts/seed-dummy-products.mjs.
//
// Usage: node scripts/seed-testing-data.mjs

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import bcrypt from "bcryptjs";
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

function pick(arr, i) {
  return arr[i % arr.length];
}

function isoDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

const ROW_COUNT = 30;

// --- Categories --------------------------------------------------------
const CATEGORY_WORDS = [
  "Signature",
  "Heritage",
  "Modern",
  "Vintage",
  "Everyday",
  "Statement",
  "Bridal",
  "Casual",
  "Luxe",
  "Minimal",
];
const CATEGORY_ITEMS = ["Rings", "Necklaces", "Bracelets", "Earrings", "Pendants", "Anklets"];

async function seedCategories(runTag) {
  const [existingParent] = await sql`SELECT id FROM categories WHERE parent_id IS NULL LIMIT 1`;

  const rows = Array.from({ length: ROW_COUNT }, (_, i) => {
    const name = `${pick(CATEGORY_WORDS, i)} ${pick(CATEGORY_ITEMS, i + 2)} ${i + 1}`;
    return {
      name,
      slug: slugify(`${name}-${runTag}`),
      parent_id: existingParent && i % 3 === 0 ? existingParent.id : null,
      is_visible: i % 5 !== 0,
    };
  });

  for (const row of rows) {
    await sql`
      INSERT INTO categories (name, slug, parent_id, is_visible)
      VALUES (${row.name}, ${row.slug}, ${row.parent_id}, ${row.is_visible})
    `;
  }
  return rows.length;
}

// --- Coupons -------------------------------------------------------------
const DISCOUNT_TYPES = ["percentage", "fixed", "free_shipping"];
const STATUSES = ["ACTIVE", "SCHEDULED", "DRAFT", "EXPIRED"];

async function seedCoupons(runTag) {
  const rows = Array.from({ length: ROW_COUNT }, (_, i) => {
    const type = pick(DISCOUNT_TYPES, i);
    const status = pick(STATUSES, i);
    const value = type === "percentage" ? 5 + (i % 10) * 5 : type === "fixed" ? 100 + (i % 15) * 150 : null;
    const usageLimit = i % 4 === 0 ? null : 50 + i * 5;
    const usageCount = usageLimit ? Math.min(usageLimit, i * 2) : i * 2;

    let startDate = null;
    let endDate = null;
    if (status === "EXPIRED") {
      startDate = isoDate(-60 - i);
      endDate = isoDate(-10 - i);
    } else if (status === "SCHEDULED") {
      startDate = isoDate(10 + i);
      endDate = isoDate(40 + i);
    } else if (status === "ACTIVE") {
      startDate = isoDate(-30 - i);
      endDate = i % 3 === 0 ? null : isoDate(30 + i);
    }

    return {
      code: `SD${runTag}${String(i + 1).padStart(2, "0")}`.toUpperCase(),
      description: `Seed test coupon #${i + 1}`,
      discount_type: type,
      discount_value: value,
      min_purchase_amount: i % 3 === 0 ? null : 500 + i * 25,
      usage_limit: usageLimit,
      usage_count: usageCount,
      status,
      start_date: startDate,
      end_date: endDate,
    };
  });

  for (const row of rows) {
    await sql`
      INSERT INTO coupons (
        code, description, discount_type, discount_value, min_purchase_amount,
        usage_limit, usage_count, status, start_date, end_date
      ) VALUES (
        ${row.code}, ${row.description}, ${row.discount_type}, ${row.discount_value}, ${row.min_purchase_amount},
        ${row.usage_limit}, ${row.usage_count}, ${row.status}, ${row.start_date}, ${row.end_date}
      )
    `;
  }
  return rows.length;
}

// --- Customers -------------------------------------------------------------
const FIRST_NAMES = ["Ava", "Liam", "Maya", "Noah", "Zara", "Kabir", "Isla", "Arjun", "Priya", "Dev"];
const LAST_NAMES = ["Sharma", "Patel", "Iyer", "Khan", "Mehta", "Reddy", "Nair", "Gupta", "Das", "Rao"];
const GROUPS = ["Retail", "Wholesale", "VIP"];

async function seedCustomers(runTag) {
  const passwordHash = await bcrypt.hash("SeedTest#12345", 12);

  const rows = Array.from({ length: ROW_COUNT }, (_, i) => {
    const isGuest = i % 6 === 0;
    return {
      first_name: pick(FIRST_NAMES, i),
      last_name: pick(LAST_NAMES, i + 3),
      email: `seed.customer.${runTag}.${i + 1}@example.com`,
      phone: `+1415555${String(1000 + i).padStart(4, "0")}`,
      password_hash: isGuest ? null : passwordHash,
      customer_group: pick(GROUPS, i),
      loyalty_points: (i * 137) % 5000,
      accepts_marketing: i % 2 === 0,
      is_guest: isGuest,
      terms_accepted_at: isGuest ? null : new Date().toISOString(),
    };
  });

  for (const row of rows) {
    await sql`
      INSERT INTO customers (
        first_name, last_name, email, phone, password_hash,
        customer_group, loyalty_points, accepts_marketing, is_guest, terms_accepted_at
      ) VALUES (
        ${row.first_name}, ${row.last_name}, ${row.email}, ${row.phone}, ${row.password_hash},
        ${row.customer_group}, ${row.loyalty_points}, ${row.accepts_marketing}, ${row.is_guest}, ${row.terms_accepted_at}
      )
    `;
  }
  return rows.length;
}

// --- Staff users -------------------------------------------------------------
async function seedStaffUsers(runTag) {
  const roles = await sql`SELECT slug FROM admin_roles WHERE status = 'active' ORDER BY slug`;
  if (roles.length === 0) {
    console.log("  Skipping staff users — no rows in admin_roles (run db:migrate:admin-roles first).");
    return 0;
  }

  const passwordHash = await bcrypt.hash("SeedTest#12345", 12);
  const count = 20;

  const rows = Array.from({ length: count }, (_, i) => {
    const lockedUntil = i % 9 === 0 ? isoDate(3) : null;
    return {
      first_name: pick(FIRST_NAMES, i + 1),
      last_name: pick(LAST_NAMES, i),
      email: `seed.staff.${runTag}.${i + 1}@example.com`,
      phone: `+1415556${String(1000 + i).padStart(4, "0")}`,
      bio: null,
      role: pick(roles, i).slug,
      two_factor_enabled: i % 3 === 0,
      password_hash: passwordHash,
      last_login_at: i % 4 === 0 ? null : new Date(Date.now() - i * 86400000).toISOString(),
      locked_until: lockedUntil,
    };
  });

  for (const row of rows) {
    await sql`
      INSERT INTO users (
        first_name, last_name, email, phone, bio, role,
        two_factor_enabled, password_hash, last_login_at, locked_until
      ) VALUES (
        ${row.first_name}, ${row.last_name}, ${row.email}, ${row.phone}, ${row.bio}, ${row.role},
        ${row.two_factor_enabled}, ${row.password_hash}, ${row.last_login_at}, ${row.locked_until}
      )
    `;
  }
  return rows.length;
}

async function main() {
  const runTag = Date.now().toString(36).slice(-6);
  console.log(`Seeding testing data (run tag ${runTag})...`);

  const categoriesCount = await seedCategories(runTag);
  console.log(`  Categories: +${categoriesCount}`);

  const couponsCount = await seedCoupons(runTag);
  console.log(`  Coupons: +${couponsCount}`);

  const customersCount = await seedCustomers(runTag);
  console.log(`  Customers: +${customersCount}`);

  const staffCount = await seedStaffUsers(runTag);
  console.log(`  Staff users: +${staffCount}`);

  console.log(`\nDone. Run tag: ${runTag} — filter slugs/codes/emails containing this tag to find/remove this batch later.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
