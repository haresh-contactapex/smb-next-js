// Shimmer placeholder mirroring the wishlist page. WishlistPage shows it until
// the list has been read (the browser's guest list or the signed-in account's),
// and WishlistCardSkeleton stands in for a single card while that item's live
// details load.
function Bar({ className = "" }) {
  return <div className={`shimmer rounded ${className}`} />;
}

// Same shape as WishlistCard: image, name, price, rating, stock status, two
// pickers, Add To Cart and Remove.
export function WishlistCardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="shimmer mb-4 aspect-square rounded-md" />
      <Bar className="h-4 w-4/5" />
      <Bar className="mt-2.5 h-4 w-20" />
      <Bar className="mt-2.5 h-3.5 w-32" />
      <Bar className="mt-2.5 h-3.5 w-16" />
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
        <div>
          <Bar className="mb-1 h-3 w-10" />
          <Bar className="h-[37px] w-32" />
        </div>
        <div>
          <Bar className="mb-1 h-3 w-10" />
          <Bar className="h-[37px] w-16" />
        </div>
      </div>
      <Bar className="mt-5 h-[46px] w-full" />
      <Bar className="mx-auto mt-3 h-3.5 w-36" />
    </div>
  );
}

export default function WishlistSkeleton({ cards = 4 }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your wishlist…</span>

      <Bar className="mb-6 h-5 w-24" />
      <ul aria-hidden="true" className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: cards }, (_, i) => (
          <li key={i} className="min-w-0">
            <WishlistCardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}
