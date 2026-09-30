import {
  Skeleton,
  SkeletonPage,
  SectionLabelSkeleton,
  StatCardSkeleton,
  ToolbarSkeleton,
  ChartCardSkeleton,
} from "@/components/admin-panel/Skeleton";

function ReportSectionSkeleton() {
  return (
    <section className="space-y-4">
      <Skeleton className="h-6 w-40" />
      <div>
        <SectionLabelSkeleton className="w-32" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }, (_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </div>
      </div>
      <ChartCardSkeleton className="p-5" />
    </section>
  );
}

// Mirrors the reports page: toolbar, then three headed sections of stat cards
// followed by a chart.
export default function ReportsSkeleton() {
  return (
    <SkeletonPage label="Loading reports…">
      <ToolbarSkeleton actions={["w-32"]} />
      <ReportSectionSkeleton />
      <ReportSectionSkeleton />
      <ReportSectionSkeleton />
    </SkeletonPage>
  );
}
