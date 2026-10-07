# Blog

Staff write the store's blog under **Blog** in the admin panel. It works like [CMS pages](../cms/cms.md) (same rich-text editor, version history, role permissions and conflict handling), with the extra fields a blog post needs: a category, an author, a date, tags, a featured picture and a short summary for the listing. A published post is served by the storefront at `/blogs/<category>/<slug>`, the address the old store used, and the blog index is at `/blog`.

## Setup

```bash
npm run db:migrate:blog   # creates blog_posts and blog_post_revisions (safe to run again)
npm run db:seed:blog      # optional: creates the 31 posts of the old store's blogs
npm run db:seed:blog -- classic-bands                                  # or one category (by its URL name) ...
npm run db:seed:blog -- how-to-size-a-womens-wedding-band              # ... or only the posts you name (by slug)
```

The seed script never overwrites a post whose URL already exists. It reads `scripts/blog-content/posts.json` (slug, title, category, author, date, tags, listing summary, featured picture and its description, SEO title and description) and one `scripts/blog-content/<slug>.html` per post. Every post is created **published**, with its original date, so the newest appears first. Featured pictures are in `public/storefront/blog/<slug>.jpg` and are referenced by path, so they are served with the site rather than from the Media library. Until the migration has run, the admin Blog pages explain what is missing, and the storefront shows an empty blog (the post and category addresses are a normal 404 and the footer has no Blog link).

## Data

SQL: [`blog-posts-table-only.sql`](blog-posts-table-only.sql).

| Table | Purpose |
| --- | --- |
| `blog_posts` | One row per post: `slug` (unique across all posts), `title`, `excerpt` (the listing summary), `content_html`, `featured_image_url` / `featured_image_alt`, `category_name` and `category_slug`, `author_name`, `tags` (`TEXT[]`), `published_on` (a `DATE`), `seo_title`, `seo_description`, `status` (`draft` / `published`) and who created and last updated it. |
| `blog_post_revisions` | The title and body a save replaced. The latest 20 per post are kept; deleting a post deletes its revisions. |

The body is HTML, cleaned by the **cms profile** of `src/lib/sanitizeHtml.js` when saved and again when shown, exactly as for CMS pages (see the table of supported classes in `docs/cms/cms.md`).

A **category** is just a name on the post; its URL segment is always the slug of that name (`Classic Bands` is `classic-bands`). Posts of one category share one spelling: typing `classic bands` for a category that exists as `Classic Bands` keeps the existing spelling. There is no separate category screen: a category appears when its first post is saved and disappears with its last. To rename one, change the category on each of its posts.

The date is a plain date in UTC. A post that is **published with a date in the future is scheduled**: it shows as Scheduled in the list and goes live on that date. A published post saved without a date gets today's date.

## Permissions

Blog has its own module, `blog.*` (sidebar item id `blog`, see `src/lib/permissions.js`). Do not rename the id: it orphans permissions already granted. Roles with full access hold all of these; other roles are set up in Settings → Admin & Roles (the seeded roles do not hold any Blog permission yet).

| Permission | Allows |
| --- | --- |
| `blog.view` | The post list. |
| `blog.create` | Add Post. Needs `blog.publish` to save as Published, otherwise it is saved as a draft. |
| `blog.edit` | The editor, the version history and uploading pictures for a post. |
| `blog.publish` | Changing a post between Draft and Published. |
| `blog.delete` | Deleting a post. |

The permission is enforced in every API route (middleware does not cover `/api`) and by `src/lib/routePermissions.js` for the admin pages. The Media API accepts the editor's uploads from `blog.create` / `blog.edit` as well (`purpose=cms`).

## Admin pages

| URL | Permission | |
| --- | --- | --- |
| `/admin/blog` | `blog.view` | All posts, with search (title, address, author) and status/category filters. A published post dated in the future is listed as Scheduled. |
| `/admin/blog/new` | `blog.create` | Add Post. The URL follows the title until it is edited by hand; the author starts as the signed-in staff member. |
| `/admin/blog/[id]/edit` | `blog.edit` | Editor. |

The form is `src/components/blog/BlogPostForm.js`; it reuses the CMS editor, preview, media picker and version history (`src/components/cms/`). Saving sends the `updatedAt` the editor loaded: if someone else saved in between, the server answers 409 and the editor offers to reload. Changing a post's URL or category does not redirect the old address, except that a post still found under its slug in the wrong category redirects to the right one.

## API

All routes use the `{ success, data }` / `{ success: false, error }` envelope. A validation failure also returns `field` and `errors` (field → message). Rules shared by the form and the server are in `src/lib/blogRules.js`.

| Route | Permission | |
| --- | --- | --- |
| `GET /api/blog/posts` | `blog.view` | List, without bodies. |
| `POST /api/blog/posts` | `blog.create` | Create. 409 on a duplicate URL. |
| `GET /api/blog/posts/[id]` | `blog.view` or `blog.edit` | One post with its body. |
| `PUT /api/blog/posts/[id]` | `blog.edit` | Save. Takes the post fields and `expectedUpdatedAt`. 409 on a conflict or duplicate URL. |
| `DELETE /api/blog/posts/[id]` | `blog.delete` | Delete. |
| `GET /api/blog/posts/[id]/revisions` | `blog.edit` | Earlier versions, newest first, without bodies. |
| `GET /api/blog/posts/[id]/revisions/[revisionId]` | `blog.edit` | One earlier version. |

## Storefront

| URL | |
| --- | --- |
| `/blog` | Every published post, newest first, nine to a page (`?page=2`), with the category filter. |
| `/blogs` | Redirects to `/blog` (the old store's address). |
| `/blogs/<category>` | One category, same layout. A category with no live post is a 404. |
| `/blogs/<category>/<slug>` | A post: breadcrumb, title, date, author, category, featured picture, body, tags with share links (Facebook, X, Pinterest) and links to the previous (older) and next (newer) post of the category. Draft, scheduled and unknown posts are a 404. |

- The pages are `force-dynamic` (live data). The post page sets the SEO title and description (falling back to the title and the listing summary), Open Graph article data and `BlogPosting` structured data.
- The footer's Customer Service column links to `/blog` (between About Us and Contact Us) once a post is published (`hasPublishedBlogPosts`).
- `blog` and `blogs` are reserved: a CMS page can never take those URLs (`src/lib/cmsRules.js`).
- The post body is drawn by `.cms-content` in `storefront.css`; a picture on its own between paragraphs is centered (`.blog-body`).

## The imported posts

The 31 posts were written from the old store's backups (`PAGE BK UP/BLOGS-Screenshot`: one Word file with the text and one screenshot per post). The text, date, author, category, tags and original address come from the Word file; the featured picture is cropped from the screenshot (one post's original photo was embedded in its file); the in-post diagrams of *How to Size a Women's Wedding Band* reuse the ring sizer pictures already on this site.

- Two files repeated a post (the anniversary significance post and the classic complete guide); each is imported once.
- Links to the old store were rewritten to this site: `/collections/<handle>` to the matching category (`mens-classic-wedding-bands` is `men-s-classic-wedding-bands` here), `/products/<handle>` unchanged (all exist), `/pages/wedding-bands`, `/pages/anniversary-bands` and `/pages/classic-wedding-bands` to the first category of the matching menu, as the storefront navigation does, and `/pages/online-ring-sizer-tool` to `/ring-sizer-tool`.
- The "favorite bands" lists name products without linking them in the backups; each name is linked to the product with that title.
- Search-engine titles are the ones the old pages showed in their breadcrumb where they differed from the heading. The listing summaries and meta descriptions were written from each post.
- A few obvious typos were corrected (`wont`, `incredibly versatility`, `access diamonds`), and two scrambled sentences in *The Debate of Thin Versus Wide Wedding Bands for Women* were put back in order (the old page showed them scrambled too).
