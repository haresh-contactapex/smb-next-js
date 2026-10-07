// Creates the store's content pages in the CMS (admin panel -> CMS): the pages linked from
// the live site's footer, as empty DRAFTS ready to be filled in and published, plus any page
// whose content is ready in scripts/cms-content/<slug>.html (those are created with that content
// and published). Safe to run again: a page whose URL already exists is left exactly as it is, so
// nothing an admin has written is ever overwritten. Writes directly to Neon, so it needs no
// running dev server or login (same pattern as scripts/migrate.mjs).
//
// Requires: npm run db:migrate:cms
// Usage:    npm run db:seed:cms                       every page in the manifest
//           npm run db:seed:cms -- ring-sizer-tool    only the pages named (by slug)
//           npm run db:seed:cms -- education          every page of a folder: education, customer-service or cities

import { existsSync, readFileSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
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

// Content files are cleaned with the same allowlist the CMS applies on save. That module is an ES
// module in a .js file, which plain Node loads from 22.7 on; on older Node the page is still created
// and the storefront cleans it again when it is shown.
let sanitizeCmsHtml = (html) => html;
try {
  ({ sanitizeCmsHtml } = await import(pathToFileURL(path.join(__dirname, "..", "src", "lib", "sanitizeHtml.js")).href));
} catch {
  console.warn("Could not load src/lib/sanitizeHtml.js (needs Node 22.7+): content is stored as written.");
}

// The pages are listed in scripts/cms-content/pages.json: slug, title, folder (which set of pages it came
// with, only used to pick pages to seed), footer column (group, or null for none), footer link text, order (position) and, for a page whose content is ready, the file in the same folder
// (<slug>.html) with its SEO title and description. A page with content is created from that file and
// published; the others are created as empty drafts.
const PAGES = JSON.parse(readFileSync(path.join(__dirname, "cms-content", "pages.json"), "utf8"));

// Arguments name pages by slug or whole folders (education, customer-service, cities).
const requested = process.argv.slice(2);
const unknown = requested.filter((name) => !PAGES.some((page) => page.slug === name || page.folder === name));
if (unknown.length) throw new Error(`Unknown page or group: ${unknown.join(", ")}. Known slugs: ${PAGES.map((page) => page.slug).join(", ")}`);

// The files are written with line breaks and indentation between tags; drop that so it is not stored as text.
const compact = (html) => html.replace(/>\s*\n\s*</g, "><").trim();

function contentFor(page) {
  if (!page.content) return "";
  const file = path.join(__dirname, "cms-content", page.content);
  if (!existsSync(file)) throw new Error(`Content file missing: scripts/cms-content/${page.content}`);
  return sanitizeCmsHtml(compact(readFileSync(file, "utf8")));
}

let created = 0;
let skipped = 0;
for (const page of PAGES) {
  if (requested.length && !requested.includes(page.slug) && !requested.includes(page.folder)) continue;
  const status = page.content ? "published" : "draft";
  const rows = await sql`
    INSERT INTO cms_pages (slug, title, content_html, seo_title, seo_description, status, footer_group, footer_label, position)
    VALUES (${page.slug}, ${page.title}, ${contentFor(page)}, ${page.seoTitle || null}, ${page.seoDescription || null},
            ${status}, ${page.group || null}, ${page.footerLabel || null}, ${page.position})
    ON CONFLICT (slug) DO NOTHING
    RETURNING id
  `;
  if (rows.length) {
    created += 1;
    console.log(`  created /${page.slug} (${status})`);
  } else {
    skipped += 1;
    console.log(`  /${page.slug} already exists, left alone`);
  }
}

console.log(`CMS pages: ${created} created, ${skipped} already existed and were left alone.`);
