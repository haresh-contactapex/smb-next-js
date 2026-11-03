# Home page content

Staff edit the storefront home page (`/`) under **CMS → Home Page** in the admin panel
(`/admin/cms/home-page`). Products under *Shop the Highlights* are not part of this: they come
from the catalog (Most Loved = best selling, New Arrivals = newest).

## What is editable

| Section | Fields |
| --- | --- |
| Hero | headline start, highlighted word, headline, introduction, button text and link |
| Hero photos | two columns (2–8 photos each): photo from the Media library, description. The left column scrolls up, the right column down |
| Perks line | 1–6 short lines under the hero |
| Explore Our Collections | 2–8 tiles: name, link, photo, hover text |
| Our Story | heading, side text (e.g. "Since 2001"), story text, photo, photo description, button text and link |
| Assurances | 1–6 items: icon (diamond, truck, heart, shield), title, text |
| Newsletter | heading |

Text is plain text (never HTML); a blank line in a longer text starts a new line break. Links must
start with `/` (a page of this site) or `https://`. Images come from the Media library
(upload new ones from the picker) or an `https://` address.

## Storage

Table `home_page` (`docs/storefront/home-page-table-only.sql`, `npm run db:migrate:home-page`):
one row (`id = 1`) holding the whole content as JSON. Until a row exists, and whenever the table or
the database can't be read, the home page shows the content the store launched with
(`DEFAULT_HOME_PAGE` in `src/lib/shared/homePage.js`), so the page never goes down with it.

## Code

- `src/lib/shared/homePage.js` — defaults, limits and `normalizeHomePage` (the checks the form and the server both run).
- `src/lib/homePage.js` — `getHomePageForAdmin`, `getHomePageContent` (storefront, never throws), `saveHomePage`.
- `src/app/api/cms/home-page/route.js` — `GET` needs `content.view`, `PUT` needs `content.edit` (same CMS permissions as pages and footer text).
- `src/app/admin/cms/home-page/page.js` and `src/components/cms/HomePageForm.js` — the admin screen.
- `src/app/(site)/page.js` — renders the saved content.
