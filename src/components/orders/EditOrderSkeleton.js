import { Skeleton, SkeletonCard, SkeletonPage } from "@/components/admin-panel/Skeleton";

// Mirrors EditOrderForm: back link + title with Cancel/Save, a two-thirds column
// (products, summary & tax, payments) and a one-third column (status, customer,
// billing and shipping address). Shared by the route's loading.js and by the
// form itself while it fetches the order, so the two phases look identical.
//
// Each bar sits in a box as tall as the text line it stands for, so the cards
// come out the same height as the loaded ones and the page doesn't shift when
// the order arrives.

// One text line: a bar centred in a box of the line's height.
function Line({ box = "h-5", bar = "h-3.5 w-32", className = "" }) {
  return (
    <div className={`${box} flex items-center ${className}`}>
      <Skeleton className={bar} />
    </div>
  );
}

function CardTitle({ width = "w-32" }) {
  return <Line box="h-5" bar={`h-4 ${width}`} className="mb-4" />;
}

function ProductRow() {
  return (
    <div className="flex items-center gap-4 py-3">
      <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
      <div className="min-w-0 flex-1">
        <Line bar="h-3.5 w-3/4" />
        <Line box="h-[18px]" bar="h-3 w-24" />
      </div>
      <Skeleton className="h-3.5 w-24 hidden sm:block" />
      <Skeleton className="h-3.5 w-20" />
    </div>
  );
}

function SummaryRow({ note = false, strong = false }) {
  return (
    <div className={`flex items-start justify-between gap-4 ${strong ? "pt-3 mt-1 border-t border-slate-100 dark:border-white/5" : ""}`}>
      <div>
        <Line bar={`h-3.5 ${strong ? "w-12" : "w-20"}`} />
        {note && <Line box="h-[18px]" bar="h-3 w-44" />}
      </div>
      <Line bar="h-3.5 w-20" />
    </div>
  );
}

function FieldSkeleton() {
  return (
    // The real <select> sits on a line box, which leaves ~4px under it (the pb-1).
    <div className="pb-1">
      <Skeleton className="h-3 w-24 mt-1 mb-2.5" />
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}

function DetailSkeleton({ value = "w-44" }) {
  return (
    <div>
      <Line box="h-4" bar="h-2.5 w-14" />
      <Line bar={`h-3.5 ${value}`} />
    </div>
  );
}

function AddressCardSkeleton() {
  return (
    <SkeletonCard className="p-5 md:p-6">
      <CardTitle width="w-28" />
      <div className="mb-1">
        {["w-32", "w-44", "w-48", "w-24", "w-32"].map((width, index) => (
          <Line key={index} box="h-[23px]" bar={`h-3.5 ${width}`} />
        ))}
      </div>
    </SkeletonCard>
  );
}

export default function EditOrderSkeleton({ label = "Loading order…" }) {
  return (
    <SkeletonPage label={label}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Skeleton className="h-5 w-16 mb-1" />
          <Skeleton className="h-8 w-56" />
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Skeleton className="h-10 w-44 rounded-xl" />
          <Skeleton className="h-10 w-20 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SkeletonCard className="p-5 md:p-6">
            <CardTitle width="w-28" />
            <div className="divide-y divide-slate-100 dark:divide-white/5 -my-3">
              <ProductRow />
            </div>
          </SkeletonCard>

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
            <div className="flex items-center justify-between gap-3 min-h-[26px]">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Line box="h-[22px]" bar="h-3 w-40" />
            <Line box="h-5" bar="h-2.5 w-56" className="mt-1" />
          </SkeletonCard>
        </div>

        <div className="space-y-6">
          <SkeletonCard className="p-5 md:p-6">
            <div className="flex items-center gap-3 mb-5">
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <div>
                <Line box="h-6" bar="h-3.5 w-28" />
                <Line box="h-5" bar="h-3 w-40" />
              </div>
            </div>
            <div className="space-y-4">
              <FieldSkeleton />
              <FieldSkeleton />
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
        </div>
      </div>
    </SkeletonPage>
  );
}
