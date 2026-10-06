import Link from "next/link";

export default function ImportReviewsToolbar() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Link href="/admin/all-reviews" className="hover:underline">
            Product Reviews
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-800 dark:text-white">Import Reviews</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-white">Import Reviews</h1>
      </div>
      <Link
        href="/admin/all-reviews"
        className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-primary-500 dark:bg-accent-500 hover:bg-primary-600 dark:hover:bg-accent-600 text-white text-sm font-semibold shadow-sm transition-colors shrink-0 w-fit"
      >
        Back to All Reviews
      </Link>
    </div>
  );
}
