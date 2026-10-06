import {
  MAX_CONTENT_LENGTH,
  MAX_DISPLAY_NAME_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_TITLE_LENGTH,
  RATING_MAX,
  RATING_STEP,
  isValidRating,
} from "./reviewFields";

// Pure parsing of a review document's text lines. No I/O and no database, so it
// is safe to import anywhere and easy to test.
//
// The expected layout (what the "Import Reviews" help text shows):
//
//   Product Details                      <- optional header table, one
//   Product Name <tab> Ring name             "label <tab> value" line per row
//   SKU          <tab> MBR-RS5100
//   Review Count <tab> 4
//   Customer Reviews                     <- ignored heading
//   ★★★★★  5/5                           <- starts a review: stars and/or N/5
//   Onica P.                             <- reviewer's display name
//   The rose gold band is unique...      <- review text (one or more lines)
//
// A review may also carry "Title: …" and "Email: …" lines, and the name can sit
// on the rating line itself ("★★★★★ 5/5 – Onica P.").

export const MAX_IMPORT_REVIEWS = 500;

// Reviews in a document have no email, but every review row needs one. This
// reserved ".invalid" address can never receive mail and marks the row as
// imported; an admin can replace it from the Edit Review page.
export const IMPORTED_REVIEW_EMAIL = "imported-review@example.invalid";

export const ANONYMOUS_NAME = "Anonymous";

const DERIVED_TITLE_MAX = 80;
const NAME_MAX_CHARS = 60;
const NAME_MAX_WORDS = 6;

const STAR = "[★⭐]";
const EMPTY_STAR = "☆";
const FRACTION = "(\\d+(?:\\.\\d+)?)\\s*(?:\\/|out\\s+of)\\s*" + RATING_MAX;
const LABEL = "(?:rating\\s*[:\\-]?\\s*)?";

// Stars first, then optionally N/5, then an optional name (separator optional).
const STARS_LINE = new RegExp(
  `^${LABEL}((?:${STAR}|${EMPTY_STAR}|½)+)\\s*(?:\\(?\\s*${FRACTION}\\s*\\)?)?\\s*(?:[-–—|·,:]\\s*)?(.*)$`,
  "iu"
);
// N/5 with no stars. The name must follow a separator, otherwise a review that
// starts "5/5 would buy again" would be mistaken for a rating line.
const FRACTION_LINE = new RegExp(`^${LABEL}\\(?\\s*${FRACTION}\\s*\\)?\\s*(?:[-–—|·,:]\\s*(.*))?$`, "iu");

const META_KEYS = {
  "product name": "productName",
  product: "productName",
  name: "productName",
  sku: "sku",
  "overall rating": "overallRating",
  "average rating": "overallRating",
  rating: "overallRating",
  "review count": "reviewCount",
  reviews: "reviewCount",
  "total reviews": "reviewCount",
};

const LABELED = [
  { field: "title", pattern: /^(?:review\s+title|title|headline|subject)\s*:\s*(.*)$/i },
  { field: "email", pattern: /^(?:e-?mail(?:\s+address)?)\s*:\s*(.*)$/i },
  { field: "displayName", pattern: /^(?:display\s+name|reviewer|name|by)\s*:\s*(.*)$/i },
];

function clean(text) {
  return String(text ?? "")
    .replace(/[   ]/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

// -> { rating, ratingSource, name } or null when the line doesn't start a review.
export function parseRatingLine(line) {
  const text = clean(line);
  if (!text) return null;

  let match = text.match(STARS_LINE);
  if (match) {
    const [, glyphs, fraction, rest] = match;
    const filled = (glyphs.match(/[★⭐]/gu) || []).length + (glyphs.includes("½") ? 0.5 : 0);
    const stated = fraction === undefined ? null : Number(fraction);
    return {
      rating: stated ?? filled,
      starCount: filled,
      stated,
      name: clean(rest),
    };
  }

  match = text.match(FRACTION_LINE);
  if (match) {
    const stated = Number(match[1]);
    return { rating: stated, starCount: null, stated, name: clean(match[2]) };
  }
  return null;
}

// "Label<TAB>value" rows from the product-details table.
function parseMetaLine(rawLine) {
  if (!rawLine.includes("\t")) return null;
  const [key, ...rest] = rawLine.split("\t");
  const field = META_KEYS[clean(key).toLowerCase().replace(/:$/, "")];
  const value = clean(rest.join(" "));
  return field && value ? { field, value } : null;
}

function looksLikeName(line) {
  const words = line.split(" ");
  return line.length <= NAME_MAX_CHARS && words.length <= NAME_MAX_WORDS;
}

// First sentence of the review, trimmed to a headline length. Reviews in a
// document usually have no title of their own.
export function deriveTitle(content) {
  const flat = clean(content.replace(/\s*\n\s*/g, " "));
  const sentence = flat.split(/(?<=[.!?])\s+/)[0] || flat;
  let title = sentence.replace(/[.!?\s]+$/, "");
  if (title.length > DERIVED_TITLE_MAX) {
    title = title.slice(0, DERIVED_TITLE_MAX + 1);
    const lastSpace = title.lastIndexOf(" ");
    title = (lastSpace > 30 ? title.slice(0, lastSpace) : title.slice(0, DERIVED_TITLE_MAX)).replace(/[,;:\s]+$/, "") + "…";
  }
  return title.slice(0, MAX_TITLE_LENGTH);
}

function numberOrNull(value) {
  if (value === undefined || value === null) return null;
  const match = String(value).match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function buildReview(block, index) {
  const issues = [];
  const error = (message) => issues.push({ level: "error", message });
  const warn = (message) => issues.push({ level: "warning", message });

  const { rating, starCount, stated } = block.rating;
  if (!isValidRating(rating)) {
    error(
      `Rating ${rating} isn't a whole or half star between ${RATING_STEP} and ${RATING_MAX}.`
    );
  } else if (stated !== null && starCount !== null && starCount !== stated) {
    warn(`The star icons show ${starCount} but the text says ${stated}; used ${stated}.`);
  }

  // Walk the lines after the rating line: labelled fields first, then a name,
  // then the review text.
  const fields = {};
  const rest = [];
  for (const line of block.lines) {
    const labelled = LABELED.find(({ pattern }) => pattern.test(line));
    if (labelled) {
      const value = clean(line.match(labelled.pattern)[1]);
      if (value && fields[labelled.field] === undefined) {
        fields[labelled.field] = value;
        continue;
      }
    }
    rest.push(line);
  }

  let displayName = block.rating.name || fields.displayName || "";
  // No labelled or inline name: take the first line as the name when it looks
  // like one and the review still has text after it.
  if (!displayName && rest.length > 1 && looksLikeName(rest[0])) {
    displayName = rest.shift();
  }

  const content = rest.join("\n").trim();
  if (!displayName) {
    displayName = ANONYMOUS_NAME;
    // A review with no text at all is skipped anyway; one error is enough.
    if (content) warn(`No reviewer name found; used "${ANONYMOUS_NAME}".`);
  }
  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    error(`Reviewer name is longer than ${MAX_DISPLAY_NAME_LENGTH} characters.`);
  }

  if (!content) error("The review has no text.");
  else if (content.length > MAX_CONTENT_LENGTH) {
    error(`Review text is ${content.length} characters; the limit is ${MAX_CONTENT_LENGTH}.`);
  }

  let title = fields.title || "";
  let titleDerived = false;
  if (title.length > MAX_TITLE_LENGTH) {
    error(`Title is longer than ${MAX_TITLE_LENGTH} characters.`);
  }
  if (!title && content) {
    title = deriveTitle(content);
    titleDerived = true;
  }

  let email = IMPORTED_REVIEW_EMAIL;
  let emailPlaceholder = true;
  if (fields.email) {
    const candidate = fields.email.toLowerCase();
    if (candidate.length > MAX_EMAIL_LENGTH || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) {
      error(`"${fields.email}" isn't a valid email address.`);
    } else {
      email = candidate;
      emailPlaceholder = false;
    }
  }

  return {
    index,
    rating: isValidRating(rating) ? rating : null,
    title,
    titleDerived,
    content,
    displayName,
    email,
    emailPlaceholder,
    issues,
  };
}

/**
 * @param {string[]} lines  document text, one entry per line/paragraph
 * @returns {{ document: object, reviews: object[], problems: string[] }}
 *   `problems` are file-level errors (nothing importable at all).
 */
export function parseReviewLines(lines) {
  const document = { productName: null, sku: null, overallRating: null, reviewCount: null };
  const blocks = [];
  let current = null;

  for (const rawLine of lines) {
    const line = clean(rawLine);

    if (!current) {
      // Before the first review: collect the product-details table.
      const meta = parseMetaLine(String(rawLine));
      if (meta) {
        if (meta.field === "overallRating" || meta.field === "reviewCount") {
          document[meta.field] = numberOrNull(meta.value);
        } else if (document[meta.field] === null) {
          document[meta.field] = meta.value;
        }
        continue;
      }
    }

    const rating = parseRatingLine(line);
    if (rating) {
      current = { rating, lines: [] };
      blocks.push(current);
      continue;
    }
    if (current && line) current.lines.push(line);
  }

  const problems = [];
  if (blocks.length === 0) {
    problems.push(
      "No reviews were found. Each review must start with a rating line such as “★★★★★ 5/5” or “4.5/5”."
    );
  } else if (blocks.length > MAX_IMPORT_REVIEWS) {
    problems.push(
      `The file contains ${blocks.length} reviews; at most ${MAX_IMPORT_REVIEWS} can be imported at once. Split it into smaller files.`
    );
  }

  const reviews = problems.length ? [] : blocks.map((block, i) => buildReview(block, i + 1));
  return { document, reviews, problems };
}
