// Puts the HTML of a file into an existing CMS page, the same as pasting it into the page's HTML tab and
// saving: the text is cleaned with the CMS allowlist (src/lib/sanitizeHtml.js) and the page's previous version
// is saved to cms_page_revisions first, so Version history in the admin can bring it back. The page's title,
// status, footer placement and SEO fields are left alone. It writes straight to whichever database
// DATABASE_URL points at (.env.local, or the variable already set in the shell), so check which one that is.
// The page must already exist; it is a dry run unless --apply is given.
//
// Usage:  node scripts/apply-cms-html.mjs <slug> <file.html>             dry run
//         node scripts/apply-cms-html.mjs --apply <slug> <file.html>     make the change
// e.g.    node scripts/apply-cms-html.mjs --apply wedding-band src/cms-html/wedding-band.html

import { readFileSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";
import { pgTagged } from "./lib/pg-tagged.mjs";

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

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const [slug, file] = args.filter((arg) => !arg.startsWith("--"));
if (!slug || !file) {
  console.error("Usage: node scripts/apply-cms-html.mjs [--apply] <slug> <file.html>");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Add it to your .env.local file.");
}
const sql = pgTagged(process.env.DATABASE_URL);

const { sanitizeCmsHtml } = await import(pathToFileURL(path.join(__dirname, "..", "src", "lib", "sanitizeHtml.js")).href);
const html = sanitizeCmsHtml(readFileSync(path.resolve(file), "utf8")).trim();
if (!html) throw new Error(`${file} has no content after cleaning.`);

const [page] = await sql`SELECT id, slug, title, status, content_html FROM cms_pages WHERE slug = ${slug}`;
if (!page) throw new Error(`No CMS page with the slug "${slug}". Create it in the admin first.`);

console.log(`${page.slug} (${page.status}): ${page.content_html.length} characters now, ${html.length} from ${file}.`);
if (page.content_html === html) {
  console.log("Already up to date.");
  process.exit(0);
}
if (!apply) {
  console.log("Dry run: nothing was written. Run again with --apply to make the change.");
  process.exit(0);
}

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
console.log("Updated. The previous version is in the page's Version history.");
