"use client";

import { useId, useRef, useState } from "react";
import StarRating from "./StarRating";

const TABS = [
  { key: "info", label: "Product Information" },
  { key: "reviews", label: "Customer Reviews" },
  { key: "additional", label: "Additional Information" },
];

const ADDITIONAL_INFO = [
  { label: "Shipping", text: "Free shipping to US." },
  { label: "Returns", text: "30-Day Return Policy." },
  { label: "Warranty", text: "Free Lifetime Cleaning & Inspection." },
];

const TAB_BASE = "pb-3 text-[20px] sm:text-[24px] border-b-2 transition-colors";
const TAB_ACTIVE = "font-medium text-gray-800 border-gray-800";
const TAB_INACTIVE = "text-gray-400 hover:text-[#ef9822] border-transparent";

function formatReviewDate(iso) {
  // UTC so the server render and the browser always print the same date.
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

// `descriptionHtml` must already be sanitized (see src/lib/sanitizeHtml.js).
export default function ProductTabs({ descriptionHtml, reviews }) {
  const baseId = useId();
  const [active, setActive] = useState(TABS[0].key);
  const tabRefs = useRef({});
  const display = { fontFamily: "var(--font-playfair), serif" };

  // WAI-ARIA tabs: arrow keys move between tabs, Home/End jump to the ends.
  function onKeyDown(event) {
    const index = TABS.findIndex((tab) => tab.key === active);
    const moves = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: TABS.length - 1 };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const next = TABS[(moves[event.key] + TABS.length) % TABS.length];
    setActive(next.key);
    tabRefs.current[next.key]?.focus();
  }

  return (
    <div className="mt-16 pt-8 text-center sm:text-left">
      <div
        role="tablist"
        aria-label="Product details"
        onKeyDown={onKeyDown}
        className="flex flex-wrap justify-center sm:justify-start gap-x-8 sm:gap-x-12 gap-y-2 border-b border-gray-200 mb-6 px-2 sm:px-0"
      >
        {TABS.map((tab) => {
          const selected = tab.key === active;
          return (
            <button
              key={tab.key}
              ref={(node) => {
                tabRefs.current[tab.key] = node;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.key}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.key)}
              className={`${TAB_BASE} ${selected ? TAB_ACTIVE : TAB_INACTIVE}`}
              style={display}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="text-[16px] text-[#555555] leading-relaxed max-w-4xl text-left px-2 sm:px-0">
        <div role="tabpanel" id={`${baseId}-panel-info`} aria-labelledby={`${baseId}-tab-info`} hidden={active !== "info"}>
          {descriptionHtml ? (
            <div
              className="space-y-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-[#ef9822] [&_a]:underline [&_h1]:text-xl [&_h2]:text-xl [&_h3]:text-lg [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:border-gray-200 [&_blockquote]:pl-4"
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          ) : (
            <p>No description is available for this product yet.</p>
          )}
        </div>

        <div role="tabpanel" id={`${baseId}-panel-reviews`} aria-labelledby={`${baseId}-tab-reviews`} hidden={active !== "reviews"}>
          {reviews.count === 0 ? (
            <p>There are no reviews for this product yet.</p>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <StarRating rating={reviews.average} />
                <span className="text-sm text-gray-500">
                  {reviews.average.toFixed(1)} out of 5 · {reviews.count} {reviews.count === 1 ? "review" : "reviews"}
                </span>
              </div>
              <ul className="divide-y divide-gray-100">
                {reviews.reviews.map((review) => (
                  <li key={review.id} className="py-5 first:pt-0">
                    <StarRating rating={review.rating} className="w-4 h-4" />
                    <h3 className="mt-2 font-semibold text-[#333333]">{review.title}</h3>
                    <p className="mt-1 whitespace-pre-line">{review.content}</p>
                    <p className="mt-2 text-sm text-gray-400">
                      {review.displayName} · {formatReviewDate(review.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div role="tabpanel" id={`${baseId}-panel-additional`} aria-labelledby={`${baseId}-tab-additional`} hidden={active !== "additional"}>
          <dl className="space-y-1">
            {ADDITIONAL_INFO.map((item) => (
              <div key={item.label}>
                <dt className="inline font-semibold text-[#333333]">{item.label}: </dt>
                <dd className="inline">{item.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
