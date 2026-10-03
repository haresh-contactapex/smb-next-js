// Loading placeholders shown by `loading.js` files while an admin page's server
// component renders. They mirror the real page structure (toolbar, stat cards,
// filter bar, table card, pagination, form sections) so nothing jumps when the
// data arrives. Server-safe: no state, no client APIs.

const CARD_CLASSES = "bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card";

export function Skeleton({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse motion-reduce:animate-none rounded-lg bg-slate-200 dark:bg-white/[0.12] ${className}`}
    />
  );
}

export function SkeletonCard({ className = "", children }) {
  return <section className={`${CARD_CLASSES} ${className}`}>{children}</section>;
}

// Wrapper every page skeleton uses: announces the loading state to screen
// readers while the bars themselves stay hidden from them. The label comes
// last: as the first child of a `space-y-*` wrapper it would give the first
// real block a top margin, pushing the whole skeleton down from where the
// loaded page starts.
export function SkeletonPage({ label = "Loading…", className = "space-y-6", children }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      {children}
      <span className="sr-only">{label}</span>
    </div>
  );
}

// Breadcrumb + title on the left, action buttons on the right. `actions` is a
// list of width classes, one per button; `actionHeight` is h-10 on listing
// pages and h-9 on add/edit/settings pages, like the real toolbars.
export function ToolbarSkeleton({ actions = [], actionHeight = "h-10" }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <Skeleton className="h-3.5 w-36 mb-2" />
        <Skeleton className="h-7 w-48" />
      </div>
      {actions.length > 0 && (
        <div className="flex items-center gap-2 shrink-0">
          {actions.map((width, index) => (
            <Skeleton key={index} className={`${actionHeight} rounded-xl ${width}`} />
          ))}
        </div>
      )}
    </div>
  );
}

// Uppercase group label that sits above a row of stat cards.
export function SectionLabelSkeleton({ className = "w-20" }) {
  return <Skeleton className={`h-3.5 mb-3 ${className}`} />;
}

export function StatCardSkeleton({ className = "" }) {
  return (
    <SkeletonCard className={`p-4 ${className}`}>
      <Skeleton className="w-9 h-9 rounded-xl mb-3" />
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-3 w-28 mt-2" />
    </SkeletonCard>
  );
}

const STATS_GRID_CLASSES = {
  4: "grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
};

export function StatsSkeleton({ count = 4 }) {
  return (
    <div className={`grid gap-4 ${STATS_GRID_CLASSES[count] || STATS_GRID_CLASSES[4]}`}>
      {Array.from({ length: count }, (_, index) => (
        <StatCardSkeleton key={index} />
      ))}
    </div>
  );
}

// Search box plus dropdowns. `selects` is a list of md: width classes.
export function FiltersSkeleton({ selects = [] }) {
  return (
    <SkeletonCard className="p-4 sm:p-5">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        {selects.map((width, index) => (
          <Skeleton key={index} className={`h-10 w-full shrink-0 rounded-xl ${width}`} />
        ))}
      </div>
      <Skeleton className="h-3 w-28 mt-3" />
    </SkeletonCard>
  );
}

function CellSkeleton({ kind }) {
  switch (kind) {
    case "media":
      return (
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      );
    case "avatar":
      return (
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-full shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      );
    case "stack":
      return (
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="h-3 w-24" />
        </div>
      );
    case "badge":
      return <Skeleton className="h-6 w-16 rounded-full" />;
    case "actions":
      return (
        <div className="flex items-center justify-end gap-1">
          <Skeleton className="w-7 h-7" />
          <Skeleton className="w-7 h-7" />
          <Skeleton className="w-7 h-7" />
        </div>
      );
    default:
      return <Skeleton className="h-3.5 w-20" />;
  }
}

// `columns` is a list of cell kinds:
// "media" | "avatar" | "stack" | "text" | "badge" | "actions".
export function TableSkeleton({ columns, rows = 8 }) {
  return (
    <div className="overflow-x-auto custom-scroll -mx-1">
      <table className="w-full text-sm min-w-[820px]">
        <thead>
          <tr className="border-b border-slate-100 dark:border-white/5">
            {columns.map((kind, index) => (
              <th key={index} className="py-3 px-1 text-left">
                <Skeleton className={`h-3 w-16 ${kind === "actions" ? "ml-auto" : ""}`} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {Array.from({ length: rows }, (_, row) => (
            <tr key={row}>
              {columns.map((kind, index) => (
                <td key={index} className="py-3 px-1">
                  <CellSkeleton kind={kind} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PaginationSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 mt-4 border-t border-slate-100 dark:border-white/5">
      <div className="flex flex-wrap items-center gap-4">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="w-8 h-8" />
        <Skeleton className="w-8 h-8" />
        <Skeleton className="w-8 h-8" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  );
}

// A card headed by a title (and an optional "View all" link) that wraps a table.
export function TableCardSkeleton({ columns, rows = 5, withLink = true }) {
  return (
    <SkeletonCard className="p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-36" />
        {withLink && <Skeleton className="h-4 w-28" />}
      </div>
      <TableSkeleton columns={columns} rows={rows} />
    </SkeletonCard>
  );
}

// A card with a title, optional subtitle and tiles, and a chart-sized block.
export function ChartCardSkeleton({ height = "h-64", tiles = 0, className = "p-5 md:p-6" }) {
  return (
    <SkeletonCard className={className}>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-3 w-56 mt-2" />
      {tiles > 0 && (
        <div className="flex flex-wrap gap-3 mt-4">
          {Array.from({ length: tiles }, (_, index) => (
            <Skeleton key={index} className="h-[58px] w-[140px] rounded-xl" />
          ))}
        </div>
      )}
      <Skeleton className={`${height} mt-4 rounded-xl`} />
    </SkeletonCard>
  );
}

// Toolbar + optional stat cards + optional intro line + filter bar + table
// card, the shape shared by every "All …" listing page. `label` is announced
// to screen readers.
export default function ListingPageSkeleton({
  label = "Loading…",
  actions,
  stats = 0,
  description = false,
  selects,
  columns,
  rows,
  pagination = true,
}) {
  return (
    <SkeletonPage label={label}>
      <ToolbarSkeleton actions={actions} />
      {description && <Skeleton className="h-4 w-2/3 max-w-xl" />}
      {stats > 0 && <StatsSkeleton count={stats} />}
      <FiltersSkeleton selects={selects} />
      <SkeletonCard className="p-5 md:p-6">
        <TableSkeleton columns={columns} rows={rows} />
        {pagination && <PaginationSkeleton />}
      </SkeletonCard>
    </SkeletonPage>
  );
}

// One form card. `fields` is a count of label+input pairs (the first spans the
// full width in the two-column layout); `textarea`, `media` (a drop zone),
// `rows` (label + checkbox rows, like a permission matrix) and `avatarRow`
// add the other shapes forms use; `flat` keeps every field one column wide and
// `untitled` drops the heading bar. A bare number means `{ fields: n }`.
export function SectionCardSkeleton({ spec, columns = 2 }) {
  const {
    fields = 0,
    textarea = false,
    media = false,
    rows = 0,
    avatarRow = false,
    flat = false,
    untitled = false,
  } = typeof spec === "number" ? { fields: spec } : spec;

  return (
    <SkeletonCard className="p-5 md:p-6">
      {!untitled && <Skeleton className="h-4 w-36 mb-4" />}
      <div className="space-y-4">
        {avatarRow && (
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
        )}
        {media && <Skeleton className="h-40 w-full rounded-xl" />}
        {fields > 0 && (
          <div className={`grid grid-cols-1 gap-4 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>
            {Array.from({ length: fields }, (_, index) => (
              <div key={index} className={columns === 2 && !flat && index === 0 ? "sm:col-span-2" : ""}>
                <Skeleton className="h-3 w-24 mb-2" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            ))}
          </div>
        )}
        {textarea && (
          <div>
            <Skeleton className="h-3 w-28 mb-2" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        )}
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center justify-between gap-4 py-1">
            <Skeleton className="h-3.5 w-40" />
            <div className="flex items-center gap-3">
              <Skeleton className="w-5 h-5 rounded-md" />
              <Skeleton className="w-5 h-5 rounded-md" />
              <Skeleton className="w-5 h-5 rounded-md" />
              <Skeleton className="w-5 h-5 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonCard>
  );
}

// Add/edit/settings page: toolbar, a two-thirds column of `main` section cards,
// an optional one-third `side` column, and optional full-width `below` cards.
// Each entry is a section spec (see SectionCardSkeleton). `maxWidth` narrows a
// single-column page, e.g. "max-w-2xl".
export function FormPageSkeleton({
  label = "Loading…",
  actions = ["w-20", "w-32"],
  actionHeight = "h-9",
  main = [],
  side = [],
  below = [],
  maxWidth = "",
}) {
  const hasSide = side.length > 0;

  return (
    <SkeletonPage label={label}>
      <ToolbarSkeleton actions={actions} actionHeight={actionHeight} />
      <div className={hasSide ? "grid grid-cols-1 lg:grid-cols-3 gap-6 items-start" : maxWidth}>
        <div className={hasSide ? "lg:col-span-2 space-y-6" : "space-y-6"}>
          {main.map((spec, index) => (
            <SectionCardSkeleton key={index} spec={spec} />
          ))}
        </div>
        {hasSide && (
          <div className="space-y-6">
            {side.map((spec, index) => (
              <SectionCardSkeleton key={index} spec={spec} columns={1} />
            ))}
          </div>
        )}
      </div>
      {below.map((spec, index) => (
        <SectionCardSkeleton key={index} spec={spec} />
      ))}
    </SkeletonPage>
  );
}

// Neutral fallback for any admin page without a more specific loading.js.
export function GenericPageSkeleton({ label = "Loading…" }) {
  return (
    <SkeletonPage label={label}>
      <ToolbarSkeleton />
      <SkeletonCard className="p-5 md:p-6 space-y-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-11/12" />
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-2/3" />
      </SkeletonCard>
    </SkeletonPage>
  );
}
