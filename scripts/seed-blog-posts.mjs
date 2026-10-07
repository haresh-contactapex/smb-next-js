// Creates the store's blog posts in the Blog menu of the admin panel: the 31 articles of the old
// store's five blogs, each with the content in scripts/blog-content/<slug>.html, its featured
// picture in public/storefront/blog/ and the date, author, category and tags it had. Every post is
// created PUBLISHED. Safe to run again: a post whose URL already exists is left exactly as it is, so
// nothing an admin has written is ever overwritten. Writes directly to Neon, so it needs no running
// dev server or login (same pattern as scripts/seed-cms-pages.mjs).
//
// Requires: npm run db:migrate:blog
// Usage:    npm run db:seed:blog                          every post in the manifest
//           npm run db:seed:blog -- anniversary-bands     only the posts of a category (by its URL name) ...
//           npm run db:seed:blog -- how-to-size-a-womens-wedding-band     ... or only the posts named (by slug)

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
// module in a .js file, which plain Node loads from 22.7 on; on older Node the post is still created
// and the storefront cleans it again when it is shown.
let sanitizeCmsHtml = (html) => html;
try {
  ({ sanitizeCmsHtml } = await import(pathToFileURL(path.join(__dirname, "..", "src", "lib", "sanitizeHtml.js")).href));
} catch {
  console.warn("Could not load src/lib/sanitizeHtml.js (needs Node 22.7+): content is stored as written.");
}

// The posts are listed in scripts/blog-content/posts.json, oldest first: slug, title, category (its
// name), author, publishedOn (YYYY-MM-DD), tags, excerpt (the text on the listing card), featuredImage
// and its alt text, SEO title and description, and the content file in the same folder.
const POSTS = JSON.parse(readFileSync(path.join(__dirname, "blog-content", "posts.json"), "utf8"));

// A category's URL name is the slug of its name (same rule as categorySlugFor in src/lib/blogRules.js).
const categorySlug = (name) =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80).replace(/-$/, "");

// Arguments name posts by slug or whole categories by their URL name (classic-bands ...).
const requested = process.argv.slice(2);
const unknown = requested.filter((name) => !POSTS.some((post) => post.slug === name || categorySlug(post.category) === name));
if (unknown.length) {
  const categories = [...new Set(POSTS.map((post) => categorySlug(post.category)))];
  throw new Error(`Unknown post or category: ${unknown.join(", ")}. Categories: ${categories.join(", ")}`);
}

// The files are written with line breaks between tags; drop that so it is not stored as text.
const compact = (html) => html.replace(/>\s*\n\s*</g, "><").trim();

function contentFor(post) {
  const file = path.join(__dirname, "blog-content", post.content);
  if (!existsSync(file)) throw new Error(`Content file missing: scripts/blog-content/${post.content}`);
  return sanitizeCmsHtml(compact(readFileSync(file, "utf8")));
}

// Posts of one category share the spelling of its name (see canonicalCategoryName in src/lib/blog.js).
// Seeding uses the manifest's own spelling, which is the same for every post of a category.
let created = 0;
let skipped = 0;
for (const post of POSTS) {
  const slugOfCategory = categorySlug(post.category);
  if (requested.length && !requested.includes(post.slug) && !requested.includes(slugOfCategory)) continue;
  const rows = await sql`
    INSERT INTO blog_posts
      (slug, title, excerpt, content_html, featured_image_url, featured_image_alt, category_name, category_slug,
       author_name, tags, published_on, seo_title, seo_description, status)
    VALUES
      (${post.slug}, ${post.title}, ${post.excerpt || null}, ${contentFor(post)}, ${post.featuredImage || null},
       ${post.featuredImageAlt || null}, ${post.category}, ${slugOfCategory}, ${post.author || null},
       ${post.tags || []}::text[], ${post.publishedOn}::date, ${post.seoTitle || null}, ${post.seoDescription || null}, 'published')
    ON CONFLICT (slug) DO NOTHING
    RETURNING id
  `;
  if (rows.length) {
    created += 1;
    console.log(`  created /blogs/${slugOfCategory}/${post.slug}`);
  } else {
    skipped += 1;
    console.log(`  /blogs/${slugOfCategory}/${post.slug} already exists, left alone`);
  }
}

console.log(`Blog posts: ${created} created, ${skipped} already existed and were left alone.`);
