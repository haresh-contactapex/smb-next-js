// Shimmer placeholder mirroring BlogPostView (breadcrumb, title, meta, picture, body
// and the previous/next nav). Shown by loading.js on a hard navigation into a post,
// and by BlogPostView itself while a click on "Previous post" or "Next post" is
// still pending (that link only changes the URL's last segment, which Next.js
// re-renders in place without unmounting the page, so loading.js never gets a
// chance to show its fallback there).
function Bar({ className = "" }) {
  return <div className={`shimmer rounded ${className}`} />;
}

export default function BlogPostSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="w-full bg-white">
      <span className="sr-only">Loading post…</span>

      {/* Breadcrumb band, the same height and centering as the real one */}
      <div className="bg-[#faf7f2] rounded-t-[32px] sm:rounded-t-[50px] pt-4 pb-12 sm:pt-6 sm:pb-[74px]">
        <div className="mx-auto flex max-w-[1000px] justify-center px-4 py-6 sm:px-8">
          <Bar className="h-4 w-56 max-w-full" />
        </div>
      </div>

      <div className="relative z-10 -mt-[32px] sm:-mt-[50px] rounded-t-[32px] bg-white pt-[32px] sm:rounded-t-[50px] sm:pt-[50px]">
        <div className="mx-auto max-w-[1000px] px-4 sm:px-8 py-10 sm:py-14">
          <Bar className="h-9 w-4/5 sm:h-11" />
          <Bar className="mt-2 h-9 w-2/3 sm:h-11" />

          <div className="mt-5 flex items-center gap-4">
            <Bar className="h-4 w-28" />
            <Bar className="h-4 w-24" />
          </div>
          <Bar className="mt-3 h-4 w-28" />

          <div className="shimmer mt-6 aspect-[3/2] w-full rounded-md" />

          <div className="mt-8 flex flex-col gap-3">
            {[...Array(2)].map((_, block) => (
              <div key={block} className="flex flex-col gap-3">
                <Bar className="h-4 w-full" />
                <Bar className="h-4 w-11/12" />
                <Bar className="h-4 w-4/5" />
                {block === 0 && <Bar className="mt-2 h-6 w-1/2" />}
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-4 rounded border border-[#e5e7eb] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <Bar className="h-4 w-2/3 sm:w-80" />
            <div className="flex items-center gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="shimmer h-8 w-8 rounded-full" />
              ))}
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="flex items-center gap-4 sm:pr-6">
              <div className="shimmer h-10 w-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1">
                <Bar className="h-3 w-24" />
                <Bar className="mt-2 h-4 w-4/5" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-4 sm:pl-6">
              <div className="min-w-0 flex-1 text-right">
                <Bar className="ml-auto h-3 w-20" />
                <Bar className="ml-auto mt-2 h-4 w-4/5" />
              </div>
              <div className="shimmer h-10 w-10 shrink-0 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
