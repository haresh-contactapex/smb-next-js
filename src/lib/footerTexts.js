import { sql, sqlTransaction } from "./db";
import { isMissingRelation } from "./accountError";
import { ALL_PAGES_PATH, DEFAULT_FOOTER_TEXTS, footerTextParagraphs, normalizeFooterTextsInput } from "./footerTextRules";

// Persistence for the storefront footer text (CMS -> Footer Text): the admin read and
// save behind /api/cms/footer-texts, and the read the storefront footer makes. The
// checks come from footerTextRules.js, the same ones the form runs. See docs/cms/cms.md.

// A problem the admin can act on. Route handlers answer with `status`; `errors`
// ({ [index]: { path?, content? } }) is set when entries are at fault.
export class FooterTextError extends Error {
  constructor(message, status = 400, { errors = null } = {}) {
    super(message);
    this.name = "FooterTextError";
    this.status = status;
    this.errors = errors;
  }
}

const NOT_MIGRATED = "The footer text table is missing or out of date. Run `npm run db:migrate:footer-texts` and try again.";

function translateError(error) {
  if (isMissingRelation(error)) return new FooterTextError(NOT_MIGRATED, 503);
  return error;
}

// The all-pages entry first, then the pages by address.
const withAllPagesFirst = (entries) =>
  [...entries].sort((a, b) => (a.path === ALL_PAGES_PATH ? -1 : b.path === ALL_PAGES_PATH ? 1 : a.path.localeCompare(b.path)));

/**
 * Admin: the saved entries as [{ path, content, hidden }], the all-pages text first. Until
 * staff have saved anything this is the text the store launched with, so the first
 * save keeps it. Throws a FooterTextError when the table hasn't been migrated.
 */
export async function listFooterTexts() {
  try {
    const rows = await sql`SELECT path, content, hidden FROM footer_texts`;
    if (rows.length === 0) return DEFAULT_FOOTER_TEXTS.map((entry) => ({ ...entry, hidden: false }));
    const entries = rows.map((row) => ({ path: row.path, content: row.content, hidden: row.hidden === true }));
    // The form always has an all-pages text; fall back to the launch text if that row is gone.
    if (!entries.some((entry) => entry.path === ALL_PAGES_PATH)) entries.push({ ...DEFAULT_FOOTER_TEXTS[0], hidden: false });
    return withAllPagesFirst(entries);
  } catch (error) {
    throw translateError(error);
  }
}

/**
 * Storefront: { [path]: [paragraph, ...] }, with the all-pages text under "*". A hidden
 * entry has no paragraphs, which is how a page shows no text. Never throws: the footer
 * must not take a page down, so a failed or unmigrated lookup shows the launch text.
 */
export async function getFooterTextsByPath() {
  let entries = DEFAULT_FOOTER_TEXTS;
  try {
    entries = await listFooterTexts();
  } catch (error) {
    if (!(error instanceof FooterTextError)) console.error("Footer text failed to load", error);
  }
  return Object.fromEntries(entries.map((entry) => [entry.path, entry.hidden ? [] : footerTextParagraphs(entry.content)]));
}

/**
 * Replaces the whole set with `input` (a list of { path, content, hidden }, the all-pages text
 * first): entries missing from it are removed, the rest are added or updated.
 */
export async function saveFooterTexts(input, actor) {
  const { entries, errors } = normalizeFooterTextsInput(input);
  const first = Object.keys(errors)[0];
  if (first !== undefined) {
    const message = errors[first].path || errors[first].content;
    throw new FooterTextError(message, 400, { errors });
  }

  const actorId = actor?.id || null;
  const paths = entries.map((entry) => entry.path);
  try {
    await sqlTransaction((tx) => [
      tx`DELETE FROM footer_texts WHERE path <> ALL(${paths}::text[])`,
      ...entries.map(
        (entry) => tx`
          INSERT INTO footer_texts (path, content, hidden, updated_by)
          VALUES (${entry.path}, ${entry.content}, ${entry.hidden}, ${actorId}::uuid)
          ON CONFLICT (path) DO UPDATE
            SET content = EXCLUDED.content, hidden = EXCLUDED.hidden, updated_by = EXCLUDED.updated_by, updated_at = now()
        `
      ),
    ]);
  } catch (error) {
    throw translateError(error);
  }
  return listFooterTexts();
}
