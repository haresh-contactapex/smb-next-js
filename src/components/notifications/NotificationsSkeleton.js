import { Skeleton, SkeletonCard, SkeletonPage, ToolbarSkeleton } from "@/components/admin-panel/Skeleton";

// Mirrors the notifications page: toolbar, a card holding the four filters and
// the notification rows, then the pager.
export default function NotificationsSkeleton() {
  return (
    <SkeletonPage label="Loading notifications…">
      <ToolbarSkeleton actions={["w-36", "w-28"]} />

      <SkeletonCard className="p-5 md:p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
          <Skeleton className="h-10 rounded-xl sm:col-span-2 lg:col-span-1" />
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
        </div>

        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="flex items-start gap-3 py-3.5">
              <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="w-8 h-8" />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-4 pt-4 mt-4 border-t border-slate-100 dark:border-white/5">
          <Skeleton className="h-3 w-44" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      </SkeletonCard>
    </SkeletonPage>
  );
}
