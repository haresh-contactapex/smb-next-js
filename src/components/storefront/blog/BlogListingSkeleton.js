import { BLOG_PAGE_SIZE } from "@/lib/blogRules";

// Shimmer placeholders mirroring BlogListingView / BlogPostsBrowser (heading band,
// category chips, post grid, page links). The whole-page version (default export)
// is shown by loading.js on a hard navigation (first visit, a direct link, back/
// forward); BlogPostsBrowserSkeleton on its own is what BlogPostsBrowser swaps in
// while a category or page click is still pending, since a click that only changes
// the page's search params never unmounts the page for loading.js to take over.
function Bar({ className = "" }) {
  return <div className={`shimmer rounded ${className}`} />;
}

// One post card's placeholder, the same shape as BlogCard.
export function BlogCardSkeleton() {
  return (
    <div>
      <div className="shimmer aspect-[3/2] rounded-md" />
      <div className="mt-4 flex flex-col">
        <Bar className="h-3 w-20" />
        <Bar className="mt-2 h-5 w-4/5" />
        <Bar className="mt-2 h-3 w-32" />
        <Bar className="mt-3 h-4 w-full" />
        <Bar className="mt-1.5 h-4 w-11/12" />
      </div>
    </div>
  );
}

// Category chips + post grid + page links. `categoryChips` is 0 to leave the chip
// row out, the same as the real nav when there is nothing (or only one thing) to
// filter by.
export function BlogPostsBrowserSkeleton({ cards = BLOG_PAGE_SIZE, categoryChips = 5 }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading posts…</span>

      {categoryChips > 0 && (
        <div className="mb-10 flex flex-wrap justify-center gap-2">
          {Array.from({ length: categoryChips }, (_, i) => (
            <Bar key={i} className="h-9 w-24 rounded-full" />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }, (_, i) => (
          <BlogCardSkeleton key={i} />
        ))}
      </div>

      <div className="mt-14 flex items-center justify-center gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="shimmer h-10 w-10 rounded-full" />
        ))}
      </div>
    </div>
  );
}

export default function BlogListingSkeleton({ cards, categoryChips }) {
  return (
    <div className="w-full bg-white">
      {/* Heading band, the same shape as the real one (breadcrumb + centered title) */}
      <div className="bg-[#faf7f2] rounded-t-[32px] sm:rounded-t-[50px] px-4 pt-10 sm:pt-14 pb-16 sm:pb-24">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-3">
          <Bar className="h-9 w-48 sm:h-11 sm:w-64" />
          <Bar className="h-4 w-40" />
        </div>
      </div>

      <div className="relative z-10 -mt-[32px] sm:-mt-[50px] rounded-t-[32px] bg-white pt-[32px] sm:rounded-t-[50px] sm:pt-[50px]">
        <div className="mx-auto max-w-[1300px] px-4 sm:px-8 py-10 sm:py-14">
          <BlogPostsBrowserSkeleton cards={cards} categoryChips={categoryChips} />
        </div>
      </div>
    </div>
  );
}
