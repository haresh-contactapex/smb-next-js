"use client";

import { useEffect, useId, useRef, useState } from "react";
import StarRating from "../StarRating";
import ReviewForm from "./ReviewForm";

const PAGE_SIZE = 5;
const WRITE_BUTTON =
  "rounded border border-gray-300 bg-white px-6 py-2.5 text-[16px] font-semibold text-gray-800 transition-colors hover:border-[#ef9822] hover:text-[#ef9822] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ef9822]";

function formatReviewDate(iso) {
  // UTC so the server render and the browser always print the same date.
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

// The Customer Reviews tab: the average and count, a "Write a review" form (only
// while Settings -> Products allows customer reviews) and the approved reviews,
// newest first. A submitted review is pending moderation, so it is acknowledged
// here but doesn't join the list until a moderator approves it.
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
    <div>
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
        {hasReviews ? (
          <div className="flex items-center gap-4">
            <span className="text-[44px] font-light leading-none text-[#333333]">{reviews.average.toFixed(1)}</span>
            <div>
              <StarRating rating={reviews.average} className="h-5 w-5" />
              <p className="mt-1 text-sm text-gray-500">
                Based on {reviews.count} {reviews.count === 1 ? "review" : "reviews"}
              </p>
            </div>
          </div>
        ) : (
          <p>There are no reviews for this product yet.{allowReviews && !sent ? " Be the first to share your thoughts." : ""}</p>
        )}

        {allowReviews && !sent && (
          <button
            type="button"
            onClick={() => setFormOpen((open) => !open)}
            aria-expanded={formOpen}
            aria-controls={formId}
            className={`self-start sm:self-auto ${WRITE_BUTTON}`}
          >
            {formOpen ? "Cancel" : "Write a review"}
          </button>
        )}
      </div>

      <div id={formId}>
        {sent ? (
          <div ref={thanksRef} tabIndex={-1} role="status" className="my-6 rounded-xl border border-green-200 bg-green-50 p-5 text-green-900 outline-none">
            <p className="font-semibold">Thank you, {sent.firstName}!</p>
            <p className="mt-1 text-sm">
              We&apos;ve received your review of {productTitle}. It will appear here once our team has approved it.
            </p>
          </div>
        ) : (
          allowReviews && formOpen && (
            <div className="my-6">
              <ReviewForm handle={handle} onSent={setSent} />
            </div>
          )
        )}
      </div>

      {hasReviews && (
        <>
          <ul className="divide-y divide-gray-100">
            {reviews.reviews.slice(0, visible).map((review) => (
              <li key={review.id} className="py-6 first:pt-6">
                <div className="flex items-center gap-2">
                  <StarRating rating={review.rating} className="h-4 w-4" />
                  <span className="text-sm text-gray-400">{formatReviewDate(review.createdAt)}</span>
                </div>
                <h3 className="mt-2 font-semibold text-[#333333]">{review.title}</h3>
                <p className="mt-1 whitespace-pre-line">{review.content}</p>
                <p className="mt-2 text-sm text-gray-400">{review.displayName}</p>
              </li>
            ))}
          </ul>
          {remaining > 0 && (
            <button type="button" onClick={() => setVisible((count) => count + PAGE_SIZE)} className={`mt-2 ${WRITE_BUTTON}`}>
              Show more reviews ({remaining})
            </button>
          )}
        </>
      )}
    </div>
  );
}
