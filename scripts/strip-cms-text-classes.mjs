// Removes every class (and any inline style, which the CMS turns back into an alignment class) from
// every HTML tag of the CMS pages, so the classes can be added by hand afterwards. Elements that stand
// for something are kept as they are, because without their class they stop working: the contact-form
// placeholder (cms-embed-*), the contact details (cms-contact*) and the social icons (cms-social*).
//
// The previous version of every page that changes is saved to cms_page_revisions first, so the page's
// Version history in the admin can bring it back. It is a dry run unless --apply is given. It writes
// straight to whichever database DATABASE_URL points at (.env.local, or the variable already set in the
// shell), so check which one that is before applying.
//
// Usage:  node scripts/strip-cms-text-classes.mjs                         dry run, every page
//         node scripts/strip-cms-text-classes.mjs diamonds-education      dry run, only the pages named (by slug)
//         node scripts/strip-cms-text-classes.mjs --apply [slug ...]      make the change

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { neon } from "./lib/pg-neon.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAX_REVISIONS = 20; // keep in step with src/lib/cms.js

function loadEnvLocal() {
  let contents;
  try {
    contents = readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
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

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const slugs = args.filter((arg) => !arg.startsWith("--"));

const KEEP = /\bcms-(embed|contact|social)/;
const ATTRIBUTE = /\s(?:class|style)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

// Any opening tag; quoted attribute values may contain ">".
const TAG = /<([a-zA-Z][a-zA-Z0-9]*)((?:\s(?:"[^"]*"|'[^']*'|[^'">])*)?)>/g;

export function stripTextClasses(html) {
  let changes = 0;
  const result = html.replace(TAG, (whole, name, attributes = "") => {
    if (KEEP.test(attributes)) return whole;
    const stripped = attributes.replace(ATTRIBUTE, "");
    if (stripped === attributes) return whole;
    changes += 1;
    return `<${name}${stripped}>`;
  });
  return { html: result, changes };
}

const pages = slugs.length
  ? await sql`SELECT id, slug, title, content_html FROM cms_pages WHERE slug = ANY(${slugs}) ORDER BY slug`
  : await sql`SELECT id, slug, title, content_html FROM cms_pages ORDER BY slug`;

if (slugs.length) {
  const missing = slugs.filter((slug) => !pages.some((page) => page.slug === slug));
  if (missing.length) console.warn(`No page with the slug: ${missing.join(", ")}`);
}

let changedPages = 0;
let changedTags = 0;
for (const page of pages) {
  const { html, changes } = stripTextClasses(page.content_html);
  if (!changes) continue;
  changedPages += 1;
  changedTags += changes;
  console.log(`${apply ? "Updated" : "Would update"} ${page.slug}: ${changes} tag${changes === 1 ? "" : "s"}`);
  if (!apply) continue;

  await sql`
    INSERT INTO cms_page_revisions (page_id, title, content_html, edited_by)
    VALUES (${page.id}, ${page.title}, ${page.content_html}, NULL)
  `;
  await sql`UPDATE cms_pages SET content_html = ${html}, updated_at = now() WHERE id = ${page.id}`;
  await sql`
    DELETE FROM cms_page_revisions
    WHERE page_id = ${page.id}
      AND id NOT IN (SELECT id FROM cms_page_revisions WHERE page_id = ${page.id} ORDER BY created_at DESC LIMIT ${MAX_REVISIONS})
  `;
}

console.log(`${pages.length} page${pages.length === 1 ? "" : "s"} checked, ${changedPages} ${apply ? "changed" : "would change"} (${changedTags} tags).`);
if (!apply && changedPages) console.log("Dry run: nothing was written. Run again with --apply to make the change.");
