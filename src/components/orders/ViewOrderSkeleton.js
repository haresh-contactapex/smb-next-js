import { Skeleton, SkeletonCard, SkeletonPage } from "@/components/admin-panel/Skeleton";
import { AddressCardSkeleton, CardTitle, DetailSkeleton, Line, ProductRow, SummaryRow } from "./EditOrderSkeleton";

// Mirrors the View Order page (src/app/admin/orders/[id]/page.js): back link, title
// with its two badges, the action buttons, the progress tracker, then the products
// beside the summary, customer, addresses and payments. Shown by that route's
// loading.js, with the same line-height boxes as EditOrderSkeleton so the page
// doesn't shift when the order arrives.
export default function ViewOrderSkeleton({ label = "Loading order…" }) {
  return (
    <SkeletonPage label={label}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Skeleton className="h-5 w-16 mb-1" />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>
          <Line box="mt-1 h-5" bar="h-3.5 w-44" />
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Skeleton className="h-10 w-44 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>

      <SkeletonCard className="p-5 md:p-6">
        <div className="grid grid-cols-3">
          {[0, 1, 2].map((step) => (
            <div key={step} className="flex flex-col items-center">
              <Skeleton className="w-9 h-9 rounded-full" />
              <Line box="mt-2 h-5" bar="h-3.5 w-20" />
              {step === 0 && <Line box="h-4" bar="h-2.5 w-16" />}
            </div>
          ))}
        </div>
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/5 flex justify-center">
          <Line bar="h-3.5 w-48" />
        </div>
      </SkeletonCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] items-start">
        <SkeletonCard className="p-5 md:p-6">
          <CardTitle width="w-28" />
          <div className="divide-y divide-slate-100 dark:divide-white/5 -my-3">
            <ProductRow />
          </div>
        </SkeletonCard>

        <div className="space-y-6">
          <SkeletonCard className="p-5 md:p-6">
            <CardTitle width="w-44" />
            <div className="space-y-3">
              <SummaryRow />
              <SummaryRow />
              <SummaryRow note />
              <SummaryRow strong />
            </div>
          </SkeletonCard>

          <SkeletonCard className="p-5 md:p-6">
            <CardTitle width="w-24" />
            <Line box="h-6" bar="h-3.5 w-36" />
            <div className="mt-3 space-y-2">
              <DetailSkeleton />
              <DetailSkeleton value="w-32" />
              <DetailSkeleton value="w-24" />
            </div>
          </SkeletonCard>

          <AddressCardSkeleton />
          <AddressCardSkeleton />

          <SkeletonCard className="p-5 md:p-6">
            <CardTitle width="w-24" />
            <div className="flex items-center justify-between gap-3 min-h-[26px]">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Line box="h-[22px]" bar="h-3 w-40" />
            <Line box="h-5" bar="h-2.5 w-56" className="mt-1" />
          </SkeletonCard>
        </div>
      </div>
    </SkeletonPage>
  );
}
