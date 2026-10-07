# CMS pages

Staff manage the store's content pages (About Us, Privacy Policy, the education pages, the city pages and so on) under **CMS** in the admin panel. A published page is served by the storefront at `/<slug>`, and can be listed in the storefront footer.

## Setup

```bash
npm run db:migrate:cms   # creates cms_pages and cms_page_revisions (safe to run again)
npm run db:seed:cms      # optional: creates every page in scripts/cms-content/pages.json
npm run db:seed:cms -- ring-sizer-tool   # or only the pages you name (by slug)
npm run db:seed:cms -- education         # or a whole set of pages: education, customer-service, cities, landing
```

The seed script never overwrites a page whose URL already exists. Every page is listed in `scripts/cms-content/pages.json` (slug, title, `folder` (the set it came with, only used to pick pages to seed), footer group or none, footer link text, order and SEO fields). The city pages have no footer group. A page is created as an empty **draft** (nothing is live until someone writes the content and publishes it), unless its content is ready in `scripts/cms-content/<slug>.html`: it is then created with that content, cleaned by the same sanitizer, and **published**. Pictures used by those pages are in `public/storefront/<page or group>/` and are referenced by path, so they are served with the site rather than from the Media library. Page URLs follow the handles the old store used (`/pages/gold` became `/gold`), so one redirect rule `/pages/:handle` to `/:handle` covers them. Until the migration has run, the admin CMS pages explain what is missing, and the storefront simply has no content pages (an unknown URL is a normal 404 and the footer shows no columns).

## Data

SQL: [`cms-pages-table-only.sql`](cms-pages-table-only.sql).

| Table | Purpose |
| --- | --- |
| `cms_pages` | One row per page: `slug` (unique, the public URL), `title`, `content_html`, `seo_title`, `seo_description`, `status` (`draft` / `published`), `footer_group` (`customer-service` / `education` / none), `footer_label`, `position`, who created and last updated it. |
| `cms_page_revisions` | The title and body a save replaced. The latest 20 per page are kept; deleting a page deletes its revisions. |

The body is HTML. It is cleaned by the **cms profile** of `src/lib/sanitizeHtml.js` when saved and again when shown, so HTML that reached the table another way (a script, a manual edit) still cannot run on the storefront.

## Permissions

CMS uses the existing **Content / CMS** module (`content.*`, see `src/lib/permissions.js`). The sidebar item must keep the id `content`; renaming it orphans permissions already granted.

| Permission | Allows |
| --- | --- |
| `content.view` | The page list. |
| `content.create` | Add Page. Needs `content.publish` to save as Published, otherwise it is saved as a draft. |
| `content.edit` | The editor, the version history and uploading images or PDFs for a page. |
| `content.publish` | Changing a page between Draft and Published. |
| `content.delete` | Deleting a page. |

Roles with full access get all of these. Other roles are set up in Settings → Admin & Roles. The permission is enforced in every API route (middleware does not cover `/api`) and by `src/lib/routePermissions.js` for the admin pages.

## Admin pages

| URL | Permission | |
| --- | --- | --- |
| `/admin/cms` | `content.view` | All pages, with search and status/footer filters. Edit and Delete show only to roles that hold them. |
| `/admin/cms/new` | `content.create` | Add Page. The URL follows the title until it is edited by hand. |
| `/admin/cms/[id]/edit` | `content.edit` | Editor. |

The editor (`src/components/cms/`) is a TipTap rich-text editor with an HTML source tab. It supports headings, bold/italic/underline/strike, lists, quotes, alignment, links (optionally shown as a button), images from the Media library or a new upload, PDF upload and link, tables and rules. It also has SEO fields, a preview of the unsaved page, and Version history, where Restore loads an earlier version into the editor and nothing changes until the page is saved.

Saving sends the `updatedAt` the editor loaded. If someone else saved in between, the server answers 409 and the editor offers to reload rather than overwriting their work.

Changing a page's URL does not redirect the old one.

## API

All routes use the `{ success, data }` / `{ success: false, error }` envelope. A validation failure also returns `field` and `errors` (field → message).

| Route | Permission | |
| --- | --- | --- |
| `GET /api/cms/pages` | `content.view` | List, without bodies. |
| `POST /api/cms/pages` | `content.create` | Create. 409 on a duplicate URL. |
| `GET /api/cms/pages/[id]` | `content.view` or `content.edit` | One page with its body. |
| `PUT /api/cms/pages/[id]` | `content.edit` | Save. Takes the page fields and `expectedUpdatedAt`. 409 on a conflict or duplicate URL. |
| `DELETE /api/cms/pages/[id]` | `content.delete` | Delete. |
| `GET /api/cms/pages/[id]/revisions` | `content.edit` | Earlier versions, newest first, without bodies. |
| `GET /api/cms/pages/[id]/revisions/[revisionId]` | `content.edit` | One earlier version. |
| `POST /api/media` with `purpose=cms` | `content.create` or `content.edit` | Image upload (added to the Media library) or a PDF (stored and linked from the page only, up to 10 MB). |

Rules shared by the form and the server live in `src/lib/cmsRules.js`: title, URL, body, SEO and footer limits, and the reserved URLs. A page can never take a URL the storefront already uses (`cart`, `checkout`, `collections`, `products`, `search`, `account`, `login`, `admin`, `api` and so on).

## Storefront

- `src/app/(site)/[slug]/page.js` shows a published page: heading band with the title, a `/`-separated breadcrumb, then the body styled by `.cms-content` in `storefront.css`. Draft and unknown URLs are a 404. Next serves the storefront's own routes before this one.
- `SiteFooter` lists published pages that are placed in a footer column (Customer Service, Education), using the page's footer link text or its title. Education is laid out as two lists, set by `columns` on the group in `cmsRules.js`. It is read per request, so publishing a page updates the footer straight away.
- **Landing pages.** A page whose body starts with a `cms-hero` table is a landing page: the storefront shows it edge to edge with no heading band, and the heading inside the hero becomes the page's `<h1>` (so keep the hero as the first thing on the page). The Wedding Band page (`/wedding-bands`, from `scripts/cms-content/wedding-bands.html`) is one; the storefront's **Wedding Bands** nav link opens it (`WEDDING_BANDS_PAGE_HREF` in `navLinks.js`), and the mega menu still opens on hover. Without the page the link would 404, so seed it with `npm run db:seed:cms -- wedding-bands`.
- A page can carry a placeholder for an interactive part. A paragraph with the class `cms-embed-contact-form` is replaced by the contact form (see `docs/storefront/contact-form.md`) by `CmsEmbeds`, which only pages that contain a placeholder load.

## What the sanitizer keeps

The cms profile keeps paragraphs, headings, text formatting, lists, quotes, links (`https`, `mailto`, `tel`, `/path`, `#anchor`), images (`https` or `/path`, with alt and size), tables, rules, figures and code. The only classes kept are the ones `storefront.css` draws, and the editor keeps them when a page is re-saved:

| Class | On | Looks like | Set with |
| --- | --- | --- | --- |
| `cms-btn`, `cms-btn-outline` | link | red button, outlined button | the **Link** tool's style list |
| `cms-align-center`, `cms-align-right` | paragraph, heading | aligned text | the alignment buttons |
| `cms-lg` | heading | the larger, lighter heading of the long education pages | HTML source |
| `cms-accent` | heading | blue uppercase heading | HTML source |
| `cms-or` | paragraph | a line either side of its text ("or") | HTML source |
| `cms-plain`, `cms-striped`, `cms-cards`, `cms-columns`, `cms-products` | table | no grid; dark header with shaded rows (an empty cell is a gap, so two tables sit side by side); a grid of cards; side-by-side columns; a row of four product cards | the table tools' **Table style** list |
| `cms-hero`, `cms-tiles` | table | a full-width hero (picture on the left half, heading and text on a pale panel) and a full-width grid of three category tiles per row (picture, title, text, outline button) | the table tools' **Table style** list |
| `cms-small` | paragraph | fine print | HTML source |
| `cms-photo-right` | image | a rounded photo floated beside the text | HTML source |
| `cms-embed-contact-form` | paragraph | replaced by the contact form | HTML source |

 Scripts, event handlers, styles, iframes, forms and `data:` or `javascript:` URLs are removed. The default (basic) profile used by product descriptions is unchanged.
