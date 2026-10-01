import CartPageSkeleton from "@/components/storefront/cart/CartPageSkeleton";

// Shown inside the storefront shell while page.js queries the database. It
// stands in for the whole page, so it draws the breadcrumb and heading too.
export default function Loading() {
  return (
    <>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-6">
        <div className="shimmer h-5 w-52 max-w-full rounded" />
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 pb-16">
        <div className="shimmer mb-8 h-10 w-64 max-w-full rounded sm:h-11" />
        <CartPageSkeleton />
      </div>
    </>
  );
}
