"use client";

import { useEffect, useId, useRef, useState } from "react";
import StarRating from "../StarRating";
import ReviewForm from "./ReviewForm";

const PAGE_SIZE = 6; // a multiple of 3, so the desktop grid never ends on a gap
const STAR_ROWS = [5, 4, 3, 2, 1];
const WRITE_BUTTON =
  "rounded border border-gray-300 bg-white px-6 py-2.5 text-[16px] font-semibold text-gray-800 transition-colors hover:border-[#ef9822] hover:text-[#ef9822] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ef9822]";
const DISPLAY_FONT = { fontFamily: "var(--font-playfair), serif" };

function percentOf(count, total) {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

// "<1%" rather than a misleading "0%" when a row has reviews but rounds to none.
function formatPercent(count, total) {
  const percent = percentOf(count, total);
  return count > 0 && percent === 0 ? "<1%" : `${percent}%`;
}

function initialOf(name) {
  return (String(name || "").trim().charAt(0) || "?").toUpperCase();
}

// How the approved reviews split across 5 down to 1 stars. The bars are
// decorative; each row is announced as text instead.
function RatingBreakdown({ distribution, total }) {
  return (
    <ul className="w-full max-w-xl space-y-2" aria-label="Rating breakdown">
      {STAR_ROWS.map((stars) => {
        const count = distribution?.[stars] ?? 0;
        const width = count > 0 ? Math.max(percentOf(count, total), 2) : 0;
        return (
          <li key={stars} className="flex items-center gap-3 text-[13px] text-gray-500">
            <span className="sr-only">
              {stars} star{stars === 1 ? "" : "s"}: {count} review{count === 1 ? "" : "s"} ({formatPercent(count, total)})
            </span>
            <span aria-hidden="true" className="w-3 text-right tabular-nums">
              {stars}
            </span>
            <span aria-hidden="true" className="h-2 flex-1 overflow-hidden rounded-full bg-[#ece8e1]">
              <span className="block h-full rounded-full bg-[#e8a33d]" style={{ width: `${width}%` }} />
            </span>
            <span aria-hidden="true" className="w-9 text-right tabular-nums">
              {formatPercent(count, total)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// The Customer Reviews tab: the average, the star breakdown and the approved
// reviews (newest first) as cards, plus a "Write a review" form while Settings ->
// Products allows customer reviews. A submitted review is pending moderation, so
// it is acknowledged here but doesn't join the list until a moderator approves it.
export default function ProductReviews({ reviews, handle, productTitle, allowReviews }) {
  const formId = useId();
  const thanksRef = useRef(null);
  const [formOpen, setFormOpen] = useState(false);
  const [sent, setSent] = useState(null); // { firstName } once a review has been accepted
  const [visible, setVisible] = useState(PAGE_SIZE);

  // The form unmounts on success, so hand focus to the thank-you message.
  useEffect(() => {
    if (sent) thanksRef.current?.focus();
  }, [sent]);

  const hasReviews = reviews.count > 0;
  const remaining = reviews.reviews.length - visible;

  return (
    <section aria-labelledby={`${formId}-heading`} className="rounded-2xl bg-[#faf7f2] px-5 py-8 sm:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h2 id={`${formId}-heading`} className="text-[28px] leading-tight text-[#2b2b2b]" style={DISPLAY_FONT}>
          Customer reviews
        </h2>

        {allowReviews && !sent && (
          <button
            type="button"
            onClick={() => setFormOpen((open) => !open)}
            aria-expanded={formOpen}
            aria-controls={formId}
            className={`self-start ${WRITE_BUTTON}`}
          >
            {formOpen ? "Cancel" : "Write a review"}
          </button>
        )}
      </div>

      {hasReviews ? (
        <div className="mt-6 flex flex-col gap-8 border-b border-[#e6e0d6] pb-8 sm:flex-row sm:items-start sm:gap-14">
          <div className="shrink-0">
            <p className="text-[56px] font-normal leading-none text-[#1f1f1f]" style={DISPLAY_FONT}>
              {reviews.average.toFixed(1)}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <StarRating rating={reviews.average} className="h-4 w-4" />
              <span className="text-[13px] text-gray-500">
                {reviews.average.toFixed(1)} ({reviews.count})
              </span>
            </div>
            <p className="mt-3 text-[13px] text-gray-500">
              Based on {reviews.count} {reviews.count === 1 ? "review" : "reviews"}
            </p>
          </div>
          <RatingBreakdown distribution={reviews.distribution} total={reviews.count} />
        </div>
      ) : (
        <p className="mt-4 border-b border-[#e6e0d6] pb-6">
          There are no reviews for this product yet.{allowReviews && !sent ? " Be the first to share your thoughts." : ""}
        </p>
      )}

      <div id={formId}>
        {sent ? (
          <div
            ref={thanksRef}
            tabIndex={-1}
            role="status"
            className="my-6 rounded-xl border border-green-200 bg-green-50 p-5 text-green-900 outline-none"
          >
            <p className="font-semibold">Thank you, {sent.firstName}!</p>
            <p className="mt-1 text-sm">
              We&apos;ve received your review of {productTitle}. It will appear here once our team has approved it.
            </p>
          </div>
        ) : (
          allowReviews &&
          formOpen && (
            <div className="my-6 rounded-xl bg-white p-5">
              <ReviewForm handle={handle} onSent={setSent} />
            </div>
          )
        )}
      </div>

      {hasReviews && (
        <>
          <ul className="mt-8 grid grid-cols-1 gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.reviews.slice(0, visible).map((review) => (
              <li key={review.id}>
                <StarRating rating={review.rating} className="h-4 w-4" />
                <p className="mt-4 whitespace-pre-line text-[14px] leading-relaxed text-[#6b6b6b]">{review.content}</p>
                <div className="mt-5 flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="grid h-7 w-7 place-items-center rounded-full bg-[#efe9df] text-[12px] font-medium text-[#6b5b45]"
                  >
                    {initialOf(review.displayName)}
                  </span>
                  <span className="text-[13px] text-[#555555]">{review.displayName}</span>
                </div>
              </li>
            ))}
          </ul>
          {remaining > 0 && (
            <button
              type="button"
              onClick={() => setVisible((count) => count + PAGE_SIZE)}
              className={`mt-10 ${WRITE_BUTTON}`}
            >
              Show more reviews ({remaining})
            </button>
          )}
        </>
      )}
    </section>
  );
}
