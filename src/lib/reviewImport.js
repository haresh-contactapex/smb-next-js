import { sql, sqlQuery } from "./db";
import { REVIEW_STATUSES } from "./reviewFields";
import { ReviewImportError, extractReviewLines } from "./reviewImportFile";
import { parseReviewLines } from "./reviewImportParser";

// Imports the reviews in a Word document into ONE chosen product.
//
// Two passes over the same upload keep the admin in control: a dry run parses
// and checks everything but writes nothing (the preview), and the real run
// repeats the checks and inserts every importable review in a single
// statement — all or nothing.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLUMNS_PER_ROW = 7;

const normalize = (text) => String(text ?? "").toLowerCase().replace(/\s+/g, " ").trim();
// Letters and digits only, so "Women’s Band" and "women's  band" compare equal.
const slug = (text) => String(text ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const duplicateKey = (review) => `${normalize(review.displayName)}\u0000${normalize(review.content)}`;

async function loadProduct(productId) {
  if (!UUID_PATTERN.test(String(productId ?? ""))) {
    throw new ReviewImportError("Choose the product these reviews belong to.");
  }
  const [row] = await sql`SELECT id, title, sku FROM products WHERE id = ${productId}`;
  if (!row) throw new ReviewImportError("The selected product no longer exists. Choose another product.", 404);
  return { id: row.id, title: row.title, sku: row.sku || "" };
}

// Does the document say it is about the product the admin picked? A wrong
// pick would attach every review to the wrong product, so the check is shown
// prominently and must be confirmed to proceed.
export function checkProductMatch(document, product) {
  const comparisons = [];
  if (document.sku && product.sku) comparisons.push(slug(document.sku) === slug(product.sku));
  if (document.productName && product.title) comparisons.push(slug(document.productName) === slug(product.title));

  if (comparisons.length === 0) {
    return { status: "unknown", message: "The document doesn't name a product, so it can't be checked against your selection." };
  }
  if (comparisons.some(Boolean)) {
    return { status: "match", message: `The document is for this product${document.sku ? ` (SKU ${document.sku})` : ""}.` };
  }
  const named = [document.productName && `“${document.productName}”`, document.sku && `SKU ${document.sku}`]
    .filter(Boolean)
    .join(", ");
  return {
    status: "mismatch",
    message: `The document appears to be for ${named}, but you selected “${product.title}”${
      product.sku ? ` (SKU ${product.sku})` : ""
    }.`,
  };
}

async function existingKeys(productId) {
  const rows = await sql`SELECT display_name, content FROM product_reviews WHERE product_id = ${productId}`;
  return new Set(rows.map((row) => duplicateKey({ displayName: row.display_name, content: row.content })));
}

function describe(parsed, product, existing) {
  const seen = new Set();
  const reviews = parsed.reviews.map((review) => {
    const key = duplicateKey(review);
    let duplicate = null;
    if (existing.has(key)) duplicate = "existing";
    else if (seen.has(key)) duplicate = "file";
    seen.add(key);

    const hasError = review.issues.some((issue) => issue.level === "error");
    return { ...review, duplicate, importable: !hasError && !duplicate };
  });

  const warnings = [];
  const { reviewCount } = parsed.document;
  if (reviewCount !== null && reviewCount !== reviews.length) {
    warnings.push(`The document says it has ${reviewCount} reviews, but ${reviews.length} were found.`);
  }

  return {
    product,
    document: parsed.document,
    productCheck: checkProductMatch(parsed.document, product),
    warnings,
    reviews,
    counts: {
      total: reviews.length,
      importable: reviews.filter((r) => r.importable).length,
      withErrors: reviews.filter((r) => r.issues.some((i) => i.level === "error")).length,
      duplicates: reviews.filter((r) => r.duplicate).length,
    },
  };
}

// One multi-row INSERT: atomic, and parameterised (no request text in the SQL).
async function insertReviews(productId, reviews, status) {
  const params = [];
  const tuples = reviews.map((review, i) => {
    params.push(productId, review.rating, review.title, review.content, review.displayName, review.email, status);
    const base = i * COLUMNS_PER_ROW;
    return `(${Array.from({ length: COLUMNS_PER_ROW }, (_, n) => `$${base + n + 1}`).join(", ")})`;
  });
  const rows = await sqlQuery(
    `INSERT INTO product_reviews (product_id, rating, title, content, display_name, email, status)
     VALUES ${tuples.join(", ")}
     RETURNING id`,
    params
  );
  return rows.length;
}

/**
 * @param {object} options
 * @param {Uint8Array} options.bytes        the uploaded file
 * @param {string}     options.fileName
 * @param {string}     options.productId    the ONLY product the reviews go to
 * @param {string}     [options.status]     requested moderation status
 * @param {boolean}    [options.canApprove] may the caller set a status (reviews.approve)?
 * @param {boolean}    [options.dryRun]     preview only — nothing is written
 * @param {boolean}    [options.confirmMismatch] the caller accepted a product mismatch
 */
export async function importReviews({
  bytes,
  fileName,
  productId,
  status,
  canApprove = false,
  dryRun = true,
  confirmMismatch = false,
}) {
  const requested = status === undefined || status === null || status === "" ? null : status;
  if (requested !== null && !REVIEW_STATUSES.includes(requested)) {
    throw new ReviewImportError("Choose a valid review status.");
  }
  // Without reviews.approve everything lands as PENDING, whatever was sent.
  const appliedStatus = canApprove && requested ? requested : "PENDING";

  const product = await loadProduct(productId);
  const lines = await extractReviewLines(bytes, fileName);
  const parsed = parseReviewLines(lines);
  if (parsed.problems.length) throw new ReviewImportError(parsed.problems[0]);

  const summary = {
    fileName: String(fileName || "").slice(0, 200),
    status: appliedStatus,
    ...describe(parsed, product, await existingKeys(product.id)),
  };
  if (dryRun) return { ...summary, dryRun: true, imported: 0 };

  if (summary.productCheck.status === "mismatch" && !confirmMismatch) {
    throw new ReviewImportError(
      `${summary.productCheck.message} Confirm that these reviews belong to the selected product to import them.`,
      409
    );
  }
  const importable = summary.reviews.filter((review) => review.importable);
  if (importable.length === 0) {
    throw new ReviewImportError("There is nothing to import: every review has a problem or already exists for this product.");
  }

  const imported = await insertReviews(product.id, importable, appliedStatus);
  return { ...summary, dryRun: false, imported };
}
