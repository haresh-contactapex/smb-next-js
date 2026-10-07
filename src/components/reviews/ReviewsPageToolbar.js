import Link from "next/link";
import Breadcrumbs from "@/components/admin-panel/Breadcrumbs";
import Icon from "@/components/admin-panel/Icon";
import { Can } from "@/components/providers/StaffPermissionsProvider";

export default function ReviewsPageToolbar() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <Breadcrumbs items={[{ label: "Product Reviews", href: "/admin/all-reviews" }, { label: "All Reviews" }]} />
        <h1 className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-white">All Reviews</h1>
      </div>
      <Can permission="reviews.create">
        <Link
          href="/admin/add-review"
          className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-primary-500 dark:bg-accent-500 hover:bg-primary-600 dark:hover:bg-accent-600 text-white text-sm font-semibold shadow-sm transition-colors shrink-0 w-fit"
        >
          <Icon name="plus-circle" className="w-4 h-4" />
          Add Review
        </Link>
      </Can>
    </div>
  );
}
