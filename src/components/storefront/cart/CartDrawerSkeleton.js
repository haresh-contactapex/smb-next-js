// Shimmer placeholder for the drawer body (compact lines, then the totals and
// buttons) while the cart is still being read from localStorage, so the drawer
// never claims the cart is empty before it knows.
function Bar({ className = "" }) {
  return <div className={`shimmer rounded ${className}`} />;
}

export default function CartDrawerSkeleton({ lines = 2 }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="flex flex-1 flex-col">
      <span className="sr-only">Loading your cart…</span>

      <ul className="min-h-[120px] flex-1 divide-y divide-gray-100 overflow-hidden px-5">
        {Array.from({ length: lines }, (_, i) => (
          <li key={i} className="flex gap-4 py-4">
            <div className="shimmer h-20 w-20 flex-shrink-0 rounded" />
            <div className="min-w-0 flex-1">
              <Bar className="h-4 w-4/5" />
              <Bar className="mt-2 h-3 w-1/2" />
              <Bar className="mt-2.5 h-3.5 w-20" />
              <div className="mt-3 flex items-center justify-between">
                <Bar className="h-8 w-24" />
                <Bar className="h-4 w-16" />
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex-shrink-0 border-t border-gray-200 px-5 py-4">
        <Bar className="mb-4 h-12 w-full" />
        <div className="flex items-center justify-between">
          <Bar className="h-4 w-20" />
          <Bar className="h-4 w-24" />
        </div>
        <Bar className="mt-4 h-[52px] w-full" />
        <Bar className="mt-2.5 h-[52px] w-full" />
      </div>
    </div>
  );
}
