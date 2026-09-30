// Shimmer placeholder mirroring the listing page layout (banner, heading,
// filter bar, product grid). Shown by loading.js while products are fetched.
function Bar({ className = "" }) {
  return <div className={`shimmer rounded ${className}`} />;
}

function FilterGroup({ children }) {
  return (
    <div className="flex flex-col items-center sm:items-start gap-5">
      <Bar className="h-4 w-24" />
      {children}
    </div>
  );
}

export default function ProductListingSkeleton({ cards = 8 }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading products…</span>

      {/* Hero banner */}
      <div className="shimmer w-full h-[250px] sm:h-[300px] md:h-[400px]" />

      <div className="w-full relative bg-white rounded-t-[2.5rem] sm:rounded-t-[4rem] -mt-10 sm:-mt-16 z-10 pt-10 sm:pt-14">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-8">
          {/* Title + description */}
          <div className="flex flex-col items-center gap-4 max-w-4xl mx-auto px-2">
            <Bar className="h-10 sm:h-12 w-3/4 sm:w-1/2" />
            <Bar className="h-4 w-2/3" />
            <Bar className="h-4 w-full hidden md:block" />
            <Bar className="h-4 w-5/6 hidden md:block" />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-12 border-t border-b border-gray-200 mt-10 sm:mt-12 py-8">
            <FilterGroup>
              <div className="flex gap-4">
                {Array.from({ length: 7 }, (_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="shimmer w-5 h-5 rounded-full" />
                    <Bar className="h-2.5 w-6" />
                  </div>
                ))}
              </div>
            </FilterGroup>
            <FilterGroup>
              <div className="flex items-center gap-3">
                <Bar className="h-9 w-[120px]" />
                <Bar className="h-3 w-4" />
                <Bar className="h-9 w-[120px]" />
              </div>
            </FilterGroup>
            <FilterGroup>
              <div className="grid grid-cols-6 gap-y-3 gap-x-6 w-full max-w-lg">
                {Array.from({ length: 11 }, (_, i) => (
                  <Bar key={i} className="h-4 w-8" />
                ))}
              </div>
            </FilterGroup>
          </div>

          {/* Product grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 sm:gap-y-12 pt-10 sm:pt-12 pb-16 sm:pb-24">
            {Array.from({ length: cards }, (_, i) => (
              <div key={i}>
                <div className="shimmer rounded-md aspect-square mb-3 sm:mb-4" />
                <Bar className="h-4 w-20 mb-2" />
                <Bar className="h-3.5 w-4/5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
