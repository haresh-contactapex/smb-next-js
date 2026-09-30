// Shimmer placeholder mirroring the product page layout (breadcrumb, photo
// grid, details column, tabs). Shown by loading.js while the product is fetched.
function Bar({ className = "" }) {
  return <div className={`shimmer rounded ${className}`} />;
}

function Box({ children }) {
  return <div className="border border-gray-200 rounded p-5 flex flex-col gap-3">{children}</div>;
}

export default function ProductDetailSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading product…</span>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-6">
        <Bar className="h-5 w-72 max-w-full" />
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 pb-16">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
          <div className="w-full lg:w-[55%] grid grid-cols-2 gap-4 content-start">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="shimmer rounded-md aspect-[4/3]" />
            ))}
          </div>

          <div className="w-full lg:w-[45%] flex flex-col gap-4 pt-1 sm:pt-4 lg:pr-8">
            <Bar className="h-10 sm:h-11 w-4/5" />
            <Bar className="h-6 w-32" />
            <Bar className="h-4 w-40" />
            <Box>
              <Bar className="h-4 w-24" />
              <Bar className="h-4 w-1/2" />
              <Bar className="h-4 w-2/3" />
              <Bar className="h-4 w-3/5" />
            </Box>
            <Box>
              <Bar className="h-4 w-24" />
              <div className="flex gap-4">
                {Array.from({ length: 7 }, (_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="shimmer w-[22px] h-[22px] rounded-full" />
                    <Bar className="h-2.5 w-6" />
                  </div>
                ))}
              </div>
              <Bar className="h-10 w-full" />
            </Box>
            <div className="flex items-center gap-3">
              <Bar className="h-[53px] flex-1" />
              <Bar className="h-[53px] w-[48px]" />
              <Bar className="h-[53px] flex-1" />
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8">
          <div className="flex gap-8 sm:gap-12 border-b border-gray-200 pb-3 mb-6">
            <Bar className="h-7 w-44" />
            <Bar className="h-7 w-40" />
            <Bar className="h-7 w-48 hidden sm:block" />
          </div>
          <div className="flex flex-col gap-3 max-w-4xl">
            <Bar className="h-4 w-full" />
            <Bar className="h-4 w-11/12" />
            <Bar className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}
