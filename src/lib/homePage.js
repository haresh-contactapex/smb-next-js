import { sql } from "./db";
import { isMissingRelation } from "./accountError";
import { DEFAULT_HOME_PAGE, normalizeHomePage } from "./shared/homePage";

// Persistence for the storefront home page content (CMS -> Home Page): the admin read
// and save behind /api/cms/home-page, and the read the home page makes. The checks come
// from shared/homePage.js, the same ones the form runs. See docs/storefront/home-page.md.

// A problem the admin can act on. Route handlers answer with `status`; `errors`
// ({ [dotted path]: message }) is set when fields are at fault.
export class HomePageError extends Error {
  constructor(message, status = 400, { errors = null } = {}) {
    super(message);
    this.name = "HomePageError";
    this.status = status;
    this.errors = errors;
  }
}

const NOT_MIGRATED = "The home page table is missing. Run `npm run db:migrate:home-page` and try again.";

function translateError(error) {
  if (isMissingRelation(error)) return new HomePageError(NOT_MIGRATED, 503);
  return error;
}

/**
 * Admin: the saved content, or the launch content until staff have saved anything, so
 * the first save keeps it. Throws a HomePageError when the table hasn't been migrated.
 */
export async function getHomePageForAdmin() {
  try {
    const [row] = await sql`SELECT content FROM home_page WHERE id = 1`;
    if (!row) return DEFAULT_HOME_PAGE;
    const { content, errors } = normalizeHomePage(row.content);
    return Object.keys(errors).length === 0 ? content : DEFAULT_HOME_PAGE;
  } catch (error) {
    throw translateError(error);
  }
}

/**
 * Storefront: the content to show. Never throws: the home page must not go down with
 * the database, so a failed or unmigrated lookup shows the launch content.
 */
export async function getHomePageContent() {
  try {
    return await getHomePageForAdmin();
  } catch (error) {
    if (!(error instanceof HomePageError)) console.error("Home page content failed to load", error);
    return DEFAULT_HOME_PAGE;
  }
}

/** Checks `input` and replaces the saved content with it. Returns the cleaned content. */
export async function saveHomePage(input, actor) {
  const { content, errors } = normalizeHomePage(input);
  if (Object.keys(errors).length > 0) {
    throw new HomePageError("Check the highlighted fields and try again.", 400, { errors });
  }
  try {
    await sql`
      INSERT INTO home_page (id, content, updated_by)
      VALUES (1, ${JSON.stringify(content)}::jsonb, ${actor?.id || null}::uuid)
      ON CONFLICT (id) DO UPDATE
        SET content = EXCLUDED.content, updated_by = EXCLUDED.updated_by, updated_at = now()
    `;
  } catch (error) {
    throw translateError(error);
  }
  return content;
}
