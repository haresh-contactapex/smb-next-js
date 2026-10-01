// Shimmer placeholder mirroring the cart page (lines, order summary and the
// recommended row). Shown by loading.js while the page is fetched, and by
// CartPage until the cart has been read from localStorage.
function Bar({ className = "" }) {
  return <div className={`shimmer rounded ${className}`} />;
}

function LineSkeleton() {
  return (
    <li className="flex gap-4 py-8 first:pt-0 sm:gap-8">
      <div className="w-[104px] flex-shrink-0 sm:w-[180px]">
        <div className="shimmer aspect-square w-full rounded" />
      </div>
      <div className="min-w-0 flex-1">
        <Bar className="h-5 w-4/5 sm:h-7" />
        <Bar className="mt-3 h-4 w-28 sm:h-5" />
        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-4 sm:mt-7">
          <div>
            <Bar className="mb-2 h-3 w-10" />
            <Bar className="h-[37px] w-36" />
          </div>
          <div>
            <Bar className="mb-2 h-3 w-10" />
            <Bar className="h-[37px] w-20" />
          </div>
        </div>
        <div className="mt-5 flex items-center gap-5 sm:mt-7">
          <Bar className="h-3 w-16" />
          <Bar className="h-7 w-24" />
        </div>
      </div>
    </li>
  );
}

function SummarySkeleton() {
  return (
    <div className="rounded bg-[#F8F8F8] p-6 sm:p-8">
      <div className="space-y-3">
        {[0, 1].map((row) => (
          <div key={row} className="flex items-center justify-between gap-4">
            <Bar className="h-3.5 w-1/2" />
            <Bar className="h-3.5 w-16" />
          </div>
        ))}
      </div>
      <Bar className="my-5 h-[68px] w-full" />
      <div className="border-t border-gray-300 pt-5">
        <div className="flex items-center justify-between gap-4">
          <Bar className="h-3.5 w-24" />
          <Bar className="h-3.5 w-28" />
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-4 border-t border-gray-300 pt-5">
        <Bar className="h-4 w-14" />
        <Bar className="h-6 w-24" />
      </div>
      <Bar className="mt-6 h-[52px] w-full" />
    </div>
  );
}

export default function CartPageSkeleton({ lines = 2, recommended = 4 }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your cart…</span>

      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_420px] xl:gap-16">
        <ul className="divide-y divide-gray-300 border-b border-gray-300">
          {Array.from({ length: lines }, (_, i) => (
            <LineSkeleton key={i} />
          ))}
        </ul>
        <SummarySkeleton />
      </div>

      {recommended > 0 && (
        <div className="mt-16 border-t border-gray-100 pt-12">
          <div className="mb-12 flex justify-center">
            <Bar className="h-7 w-56 sm:h-8" />
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: recommended }, (_, i) => (
              <div key={i}>
                <div className="shimmer mb-3 aspect-square rounded-md sm:mb-4" />
                <Bar className="mb-2 h-4 w-20" />
                <Bar className="h-3.5 w-4/5" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
