import { CARD } from "./accountStyles";

// Shimmer placeholder mirroring the account Orders page (OrdersList): the heading,
// the status tabs beside the order search, and a few order cards. loading.js shows
// it inside the account frame while page.js reads the customer's orders. Each bar
// sits in a box as tall as the text line it stands for, so the page doesn't shift
// when the real list arrives.
function Bar({ className = "" }) {
  return <div className={`shimmer rounded ${className}`} />;
}

// One text line: a bar centred in a box of the line's height.
function Line({ box = "h-6", bar = "h-4 w-32", className = "" }) {
  return (
    <div className={`${box} flex items-center ${className}`}>
      <Bar className={bar} />
    </div>
  );
}

const TAB_WIDTHS = ["w-[72px]", "w-[104px]", "w-[122px]", "w-[120px]", "w-[116px]"];

function OrderCardSkeleton() {
  return (
    <li className={`${CARD} flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5`}>
      <span className="flex w-[144px] flex-shrink-0 items-center">
        {[0, 1, 2].map((tile) => (
          <span key={tile} className="shimmer -ml-3 h-14 w-14 flex-shrink-0 rounded-lg border-2 border-white first:ml-0" />
        ))}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <Line bar="h-4 w-32" />
          <Bar className="h-6 w-[72px] rounded-full" />
          <Bar className="h-6 w-14 rounded-full" />
        </div>
        <Line box="h-5" bar="h-3.5 w-56 max-w-full" className="mt-1" />
      </div>

      <Line box="h-[25.5px] sm:w-36 sm:flex-shrink-0 sm:justify-center" bar="h-[18px] w-24" />

      <Line box="h-5 sm:w-36 sm:flex-shrink-0 sm:justify-end" bar="h-4 w-28" />
    </li>
  );
}

export default function OrdersListSkeleton({ cards = 4 }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your orders…</span>

      <div aria-hidden="true">
        <div className="mb-6">
          <Line box="h-[35px] sm:h-10" bar="h-7 w-40 sm:h-8" />
          <Line box="mt-1.5 h-[22.5px]" bar="h-4 w-80 max-w-full" />
        </div>

        <div className="mb-5 flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex gap-2">
              {TAB_WIDTHS.map((width) => (
                <Bar key={width} className={`h-9 flex-shrink-0 rounded-full ${width}`} />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Bar className="h-[43px] min-w-0 flex-1 rounded-lg 2xl:w-64 2xl:flex-none" />
            <Bar className="h-[43px] w-[88px] flex-shrink-0 rounded-lg" />
          </div>
        </div>

        <ul className="flex flex-col gap-4">
          {Array.from({ length: cards }, (_, index) => (
            <OrderCardSkeleton key={index} />
          ))}
        </ul>
      </div>
    </div>
  );
}
