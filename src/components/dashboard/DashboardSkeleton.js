import {
  Skeleton,
  SkeletonCard,
  SkeletonPage,
  SectionLabelSkeleton,
  StatCardSkeleton,
  ChartCardSkeleton,
  TableCardSkeleton,
} from "@/components/admin-panel/Skeleton";

// Orders section card: icon + trend badge on top, big value, label, footnote.
function OrderStatCardSkeleton() {
  return (
    <SkeletonCard className="p-4">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <Skeleton className="h-3 w-10" />
      </div>
      <Skeleton className="h-7 w-16" />
      <Skeleton className="h-3 w-24 mt-2" />
      <Skeleton className="h-3 w-28 mt-3" />
    </SkeletonCard>
  );
}

function MiniStatGridSkeleton() {
  return (
    <section>
      <SectionLabelSkeleton />
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>
    </section>
  );
}

function HeaderSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-72 mt-2" />
      </div>
      <Skeleton className="h-10 w-40 rounded-xl" />
    </div>
  );
}

// Everything under the welcome header: shown in place of the live sections
// while a new date range loads, so the header and its dropdown stay usable.
export function DashboardBodySkeleton() {
  return (
    <SkeletonPage label="Updating dashboard…">
      <section>
        <SectionLabelSkeleton className="w-16" />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }, (_, index) => (
            <OrderStatCardSkeleton key={index} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <MiniStatGridSkeleton />
        <MiniStatGridSkeleton />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartCardSkeleton height="h-72 sm:h-80" />
        <ChartCardSkeleton height="h-64 sm:h-72" tiles={3} />
      </div>

      <TableCardSkeleton columns={["text", "avatar", "text", "text", "text", "badge", "badge", "actions"]} />
      <TableCardSkeleton columns={["media", "text", "text", "text", "text", "badge"]} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SkeletonCard className="lg:col-span-2 p-5 md:p-6">
          <Skeleton className="h-5 w-32 mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-[104px] rounded-xl" />
            ))}
          </div>
        </SkeletonCard>
        <SkeletonCard className="p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-3.5 w-16 shrink-0" />
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>
    </SkeletonPage>
  );
}

// Mirrors the dashboard page: welcome header, orders stats, products/coupons
// stats, sales + earning charts, two tables, quick actions + top customers.
export default function DashboardSkeleton() {
  return (
    <SkeletonPage label="Loading dashboard…">
      <HeaderSkeleton />
      <section>
        <SectionLabelSkeleton className="w-16" />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }, (_, index) => (
            <OrderStatCardSkeleton key={index} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <MiniStatGridSkeleton />
        <MiniStatGridSkeleton />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartCardSkeleton height="h-72 sm:h-80" />
        <ChartCardSkeleton height="h-64 sm:h-72" tiles={3} />
      </div>

      <TableCardSkeleton columns={["text", "avatar", "text", "text", "text", "badge", "badge", "actions"]} />
      <TableCardSkeleton columns={["media", "text", "text", "text", "text", "badge"]} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SkeletonCard className="lg:col-span-2 p-5 md:p-6">
          <Skeleton className="h-5 w-32 mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-[104px] rounded-xl" />
            ))}
          </div>
        </SkeletonCard>
        <SkeletonCard className="p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-3.5 w-16 shrink-0" />
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>
    </SkeletonPage>
  );
}
