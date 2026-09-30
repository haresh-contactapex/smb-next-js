import { Skeleton, SkeletonCard, SkeletonPage } from "@/components/admin-panel/Skeleton";

// Mirrors the media library: heading with a description, the upload drop zone,
// then the thumbnail grid.
export default function MediaSkeleton() {
  return (
    <SkeletonPage label="Loading media…">
      <div>
        <Skeleton className="h-3.5 w-36 mb-2" />
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80 max-w-full mt-2" />
      </div>

      <div className="space-y-5">
        <SkeletonCard className="p-5">
          <Skeleton className="h-36 w-full rounded-2xl" />
        </SkeletonCard>
        <SkeletonCard className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Array.from({ length: 12 }, (_, index) => (
              <Skeleton key={index} className="aspect-square rounded-xl" />
            ))}
          </div>
        </SkeletonCard>
      </div>
    </SkeletonPage>
  );
}
