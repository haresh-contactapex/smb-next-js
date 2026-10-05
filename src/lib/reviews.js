import { sql } from "./db";
import { createRateLimiter } from "./rateLimit";
import { getProductsSettings } from "./productsSettings";
import { checkRecaptchaIfEnabled } from "./auth/recaptcha";
import { isValidEmail } from "@/components/auth/helpers";
import { normalizeReview, validateReview } from "@/components/storefront/reviews/helpers";
import {
  MAX_CONTENT_LENGTH,
  MAX_DISPLAY_NAME_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_TITLE_LENGTH,
  RATING_MAX,
  RATING_MIN,
  REVIEW_STATUSES,
  isValidRating,
} from "./reviewFields";

// Thrown for problems the client can fix; route handlers turn `status` into
// the HTTP status (400 invalid input, 404 unknown review).
export class ReviewError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A malformed id can never match a row; short-circuit instead of letting
// Postgres reject it with an "invalid input syntax for type uuid" 500.
function assertReviewId(id) {
  if (!UUID_PATTERN.test(String(id))) throw new ReviewError("Review not found.", 404);
}

export async function parseReviewBody(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    throw new ReviewError("Request body must be valid JSON.");
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ReviewError("Request body must be a JSON object.");
  }
  return payload;
}

function mapReview(row) {
  return {
    id: row.id,
    productId: row.product_id,
    productTitle: row.product_title || "",
    rating: Number(row.rating),
    title: row.title,
    content: row.content,
    displayName: row.display_name,
    email: row.email,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function listReviews() {
  const rows = await sql`
    SELECT
      r.id, r.product_id, p.title AS product_title, r.rating, r.title, r.content,
      r.display_name, r.email, r.status, r.created_at, r.updated_at
    FROM product_reviews r
    LEFT JOIN products p ON p.id = r.product_id
    ORDER BY r.created_at DESC
  `;
  return rows.map(mapReview);
}

export async function getReviewById(id) {
  if (!UUID_PATTERN.test(String(id))) return null;
  const [row] = await sql`
    SELECT
      r.id, r.product_id, p.title AS product_title, r.rating, r.title, r.content,
      r.display_name, r.email, r.status, r.created_at, r.updated_at
    FROM product_reviews r
    LEFT JOIN products p ON p.id = r.product_id
    WHERE r.id = ${id}
  `;
  return row ? mapReview(row) : null;
}

// Storefront: APPROVED reviews only, newest first. The reviewer's email is
// admin-only and deliberately never selected. The count/average cover every
// approved review even though the returned list is capped.
export async function getPublicReviewsForProduct(productId, limit = 50) {
  if (!UUID_PATTERN.test(String(productId))) return { count: 0, average: 0, reviews: [] };
  const rows = await sql`
    SELECT
      id, rating, title, content, display_name, created_at,
      COUNT(*) OVER () AS total, AVG(rating) OVER () AS average
    FROM product_reviews
    WHERE product_id = ${productId} AND status = 'APPROVED'
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return {
    count: Number(rows[0]?.total ?? 0),
    average: Number(rows[0]?.average ?? 0),
    reviews: rows.map((row) => ({
      id: row.id,
      rating: Number(row.rating),
      title: row.title,
      content: row.content,
      displayName: row.display_name,
      createdAt: new Date(row.created_at).toISOString(),
    })),
  };
}

const PRODUCT_SEARCH_MAX_LENGTH = 100;
const PRODUCT_SEARCH_DEFAULT_LIMIT = 8;

// Suggestions for the review form's product picker: products whose title or
// SKU contains the text, titles that start with it first. An empty query
// returns the first products alphabetically so the picker can be browsed.
export async function searchReviewProducts(query, limit = PRODUCT_SEARCH_DEFAULT_LIMIT) {
  const term = String(query ?? "").trim().slice(0, PRODUCT_SEARCH_MAX_LENGTH);
  const max = Math.min(Math.max(parseInt(limit, 10) || PRODUCT_SEARCH_DEFAULT_LIMIT, 1), 20);
  // Escape LIKE wildcards so "50%" or "a_b" are searched literally.
  const escaped = term.replace(/[\\%_]/g, "\\$&");
  const contains = `%${escaped}%`;
  const startsWith = `${escaped}%`;
  const rows = await sql`
    SELECT p.id, p.title, p.sku, m.url AS thumbnail
    FROM products p
    -- The main image; blob: URLs are dead local previews, so they're skipped.
    LEFT JOIN LATERAL (
      SELECT url FROM product_media
      WHERE product_id = p.id AND type = 'image' AND url NOT LIKE 'blob:%'
      ORDER BY position
      LIMIT 1
    ) m ON true
    WHERE p.title ILIKE ${contains} OR p.sku ILIKE ${contains}
    ORDER BY (p.title ILIKE ${startsWith}) DESC, p.title ASC
    LIMIT ${max}
  `;
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    sku: row.sku || "",
    thumbnail: row.thumbnail || null,
  }));
}

function requireStatus(value) {
  if (!REVIEW_STATUSES.includes(value)) throw new ReviewError("Choose a valid review status.");
  return value;
}

function reviewValues(payload) {
  const productId = String(payload.productId ?? "").trim();
  const rating = typeof payload.rating === "string" ? Number(payload.rating.trim() || NaN) : payload.rating;
  const title = String(payload.title ?? "").trim();
  const content = String(payload.content ?? "").trim();
  const displayName = String(payload.displayName ?? "").trim();
  const email = String(payload.email ?? "").trim().toLowerCase();

  if (!UUID_PATTERN.test(productId)) throw new ReviewError("Choose the product this review is for.");
  if (!isValidRating(rating)) {
    throw new ReviewError(`Rating must be from ${RATING_MIN} to ${RATING_MAX} stars, in half-star steps.`);
  }
  if (!title) throw new ReviewError("Review title is required.");
  if (title.length > MAX_TITLE_LENGTH) {
    throw new ReviewError(`Review title can be at most ${MAX_TITLE_LENGTH} characters.`);
  }
  if (!content) throw new ReviewError("Review content is required.");
  if (content.length > MAX_CONTENT_LENGTH) {
    throw new ReviewError(`Review content can be at most ${MAX_CONTENT_LENGTH} characters.`);
  }
  if (!displayName) throw new ReviewError("Display name is required.");
  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    throw new ReviewError(`Display name can be at most ${MAX_DISPLAY_NAME_LENGTH} characters.`);
  }
  if (!email || email.length > MAX_EMAIL_LENGTH || !isValidEmail(email)) {
    throw new ReviewError("Enter a valid email address.");
  }

  return { productId, rating, title, content, displayName, email };
}

// A status the client didn't send (or sent blank) means "no opinion".
function requestedStatus(payload) {
  return payload.status === undefined || payload.status === null || payload.status === ""
    ? null
    : requireStatus(payload.status);
}

// Foreign-key violation: the product was deleted between loading the form
// and saving it (or the id never existed).
function translateProductError(error) {
  if (error.code === "23503") return new ReviewError("The selected product no longer exists. Choose another product.");
  return error;
}

/**
 * `canApprove` says whether the caller may set a moderation status
 * (reviews.approve). Without it a new review is always PENDING, and an edit
 * leaves the stored status untouched — whatever the client sent.
 */
export async function createReview(payload, { canApprove = false } = {}) {
  const values = reviewValues(payload);
  const requested = requestedStatus(payload);
  const status = canApprove && requested ? requested : "PENDING";
  try {
    const [created] = await sql`
      INSERT INTO product_reviews (product_id, rating, title, content, display_name, email, status)
      VALUES (
        ${values.productId}, ${values.rating}, ${values.title}, ${values.content},
        ${values.displayName}, ${values.email}, ${status}
      )
      RETURNING id
    `;
    return created.id;
  } catch (error) {
    throw translateProductError(error);
  }
}

// Public submissions come from visitors with no login, so cap how often one
// client (IP) and one email address can submit. In-memory, so it is a speed bump
// rather than a hard cap (see rateLimit.js); moderation is the real backstop.
const clientLimiter = createRateLimiter({ limit: 5, windowMs: 10 * 60 * 1000 });
const addressLimiter = createRateLimiter({ limit: 3, windowMs: 60 * 60 * 1000 });

const MAX_HANDLE_LENGTH = 200;

// Reviews may only be written for products the storefront actually shows.
async function findActiveProductId(handle) {
  const [row] = await sql`SELECT id FROM products WHERE handle = ${handle} AND status = 'ACTIVE'`;
  return row?.id ?? null;
}

// The storefront's "Write a review" form. `payload` is the raw request body and
// `clientKey` identifies the caller for rate limiting. The review is always
// saved as PENDING through createReview (never `canApprove`), so nothing a
// visitor sends can publish itself; a moderator approves it in All Reviews.
// Resolves to { received: true }.
export async function submitStorefrontReview({ payload, clientKey }) {
  // A bot that fills the hidden field is told it worked and nothing is saved.
  if (String(payload?.honeypot ?? "").trim()) return { received: true };

  // Settings -> Products -> "Allow customer reviews". A missing settings row
  // (fresh environment) falls back to the default, which is on.
  let allowReviews = true;
  try {
    allowReviews = (await getProductsSettings()).allowReviews !== false;
  } catch {
    // Settings unavailable: keep the default.
  }
  if (!allowReviews) throw new ReviewError("Customer reviews are turned off for this store.", 403);

  const values = normalizeReview(payload);
  const firstError = Object.values(validateReview(values))[0];
  if (firstError) throw new ReviewError(firstError);

  const handle = typeof payload?.handle === "string" ? payload.handle.trim() : "";
  if (!handle || handle.length > MAX_HANDLE_LENGTH) throw new ReviewError("Choose a valid product.");

  // No short-circuit: both limiters record the attempt, so neither count drifts.
  const allowed = [clientLimiter(clientKey), addressLimiter(values.email)];
  if (allowed.includes(false)) {
    throw new ReviewError("You've sent a few reviews already. Please wait a little while before sending another.", 429);
  }

  // Required only when both Settings -> Security's reCAPTCHA toggle and
  // Settings -> Integrations' Google reCAPTCHA toggle are on (the rule every
  // other storefront form uses). After validation and the rate limit, so a
  // single-use token isn't spent on a form that was going to be refused anyway.
  const recaptchaToken = typeof payload?.recaptchaToken === "string" ? payload.recaptchaToken.slice(0, 4096) : "";
  const recaptcha = await checkRecaptchaIfEnabled(recaptchaToken);
  if (recaptcha.required && !recaptcha.valid) throw new ReviewError("reCAPTCHA verification failed. Please try again.");

  // The product comes from the catalog, never from an id in the request.
  const productId = await findActiveProductId(handle);
  if (!productId) throw new ReviewError("This product could not be found.", 404);

  // One review per email per product. A rejected one doesn't count, so a
  // visitor whose review was turned down can try again.
  const [existing] = await sql`
    SELECT 1 AS found FROM product_reviews
    WHERE product_id = ${productId} AND email = ${values.email} AND status IN ('PENDING', 'APPROVED')
    LIMIT 1
  `;
  if (existing) throw new ReviewError("It looks like you've already reviewed this product. Thank you!", 409);

  await createReview({ productId, ...values });
  return { received: true };
}

export async function updateReview(id, payload, { canApprove = false } = {}) {
  assertReviewId(id);
  const values = reviewValues(payload);
  const requested = requestedStatus(payload);
  const status = canApprove ? requested : null;
  try {
    const [updated] = await sql`
      UPDATE product_reviews SET
        product_id = ${values.productId}, rating = ${values.rating}, title = ${values.title},
        content = ${values.content}, display_name = ${values.displayName}, email = ${values.email},
        status = COALESCE(${status}, status),
        updated_at = now()
      WHERE id = ${id}
      RETURNING id
    `;
    if (!updated) throw new ReviewError("Review not found.", 404);
    return updated.id;
  } catch (error) {
    throw translateProductError(error);
  }
}

export async function setReviewStatus(id, status) {
  assertReviewId(id);
  requireStatus(status);
  const [updated] = await sql`
    UPDATE product_reviews SET status = ${status}, updated_at = now()
    WHERE id = ${id}
    RETURNING id
  `;
  if (!updated) throw new ReviewError("Review not found.", 404);
  return updated.id;
}

export async function deleteReview(id) {
  assertReviewId(id);
  const [deleted] = await sql`DELETE FROM product_reviews WHERE id = ${id} RETURNING id`;
  if (!deleted) throw new ReviewError("Review not found.", 404);
  return deleted.id;
}
