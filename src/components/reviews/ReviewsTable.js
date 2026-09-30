import Link from "next/link";
import Icon from "@/components/admin-panel/Icon";
import { Can } from "@/components/providers/StaffPermissionsProvider";
import StarRating from "./StarRating";
import { STATUS_BADGE_CLASSES, STATUS_LABELS, formatReviewDate } from "./reviewHelpers";

function SortableHeader({ label, sortKey, sort, onSortChange }) {
  const active = sort?.key === sortKey;
  const icon = active ? (sort.direction === "asc" ? "chevron-up" : "chevron-down") : "arrow-up-down";
  return (
    <th className="py-3 px-1 font-semibold">
      <button
        type="button"
        onClick={() => onSortChange(sortKey)}
        aria-label={`Sort by ${label}${active ? (sort.direction === "asc" ? ", ascending" : ", descending") : ""}`}
        className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
      >
        {label}
        <Icon name={icon} className={`w-3 h-3 ${active ? "text-primary-500 dark:text-accent-400" : "text-slate-300 dark:text-slate-600"}`} />
      </button>
    </th>
  );
}

const ACTION_BUTTON =
  "w-7 h-7 grid place-items-center rounded-lg text-slate-400 disabled:cursor-not-allowed disabled:opacity-40";

export default function ReviewsTable({ reviews, onSetStatus, onDelete, busyId, sort, onSortChange }) {
  if (reviews.length === 0) {
    return <div className="py-16 text-center text-sm text-slate-400">No reviews match your filters.</div>;
  }

  return (
    <div className="overflow-x-auto custom-scroll -mx-1">
      <table className="w-full text-sm min-w-[1040px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-white/5">
            <SortableHeader label="Rating" sortKey="rating" sort={sort} onSortChange={onSortChange} />
            <th className="py-3 px-1 font-semibold">Review</th>
            <SortableHeader label="Product" sortKey="productTitle" sort={sort} onSortChange={onSortChange} />
            <SortableHeader label="Reviewer" sortKey="displayName" sort={sort} onSortChange={onSortChange} />
            <SortableHeader label="Date" sortKey="createdAt" sort={sort} onSortChange={onSortChange} />
            <SortableHeader label="Status" sortKey="status" sort={sort} onSortChange={onSortChange} />
            <th className="py-3 px-1 font-semibold text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {reviews.map((review) => {
            const isBusy = review.id === busyId;
            return (
              <tr key={review.id} className="table-row transition-colors align-top">
                <td className="py-3 px-1 whitespace-nowrap">
                  <StarRating rating={review.rating} />
                </td>
                <td className="py-3 px-1 max-w-xs">
                  <span className="block font-medium text-slate-700 dark:text-slate-200 truncate">{review.title}</span>
                  <span className="block text-[12px] text-slate-400 line-clamp-2">{review.content}</span>
                </td>
                <td className="py-3 px-1 text-slate-600 dark:text-slate-300 max-w-[12rem]">
                  <span className="block truncate">{review.productTitle || "—"}</span>
                </td>
                <td className="py-3 px-1 max-w-[12rem]">
                  <span className="block text-slate-600 dark:text-slate-300 truncate">{review.displayName}</span>
                  <span className="block text-[11px] text-slate-400 truncate system-field">{review.email}</span>
                </td>
                <td className="py-3 px-1 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {formatReviewDate(review.createdAt)}
                </td>
                <td className="py-3 px-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${STATUS_BADGE_CLASSES[review.status]}`}
                  >
                    {STATUS_LABELS[review.status] || review.status}
                  </span>
                </td>
                <td className="py-3 px-1 text-right">
                  <div className="inline-flex items-center gap-1">
                    <Can permission="reviews.approve">
                      {review.status !== "APPROVED" && (
                        <button
                          type="button"
                          title="Approve review"
                          aria-label={`Approve review "${review.title}"`}
                          onClick={() => onSetStatus?.(review, "APPROVED")}
                          disabled={isBusy}
                          className={`${ACTION_BUTTON} hover:bg-green-50 hover:text-success dark:hover:bg-green-500/10`}
                        >
                          <Icon name="check-circle" className="w-4 h-4" />
                        </button>
                      )}
                      {review.status !== "REJECTED" && (
                        <button
                          type="button"
                          title="Reject review"
                          aria-label={`Reject review "${review.title}"`}
                          onClick={() => onSetStatus?.(review, "REJECTED")}
                          disabled={isBusy}
                          className={`${ACTION_BUTTON} hover:bg-amber-50 hover:text-warning dark:hover:bg-amber-500/10`}
                        >
                          <Icon name="x-circle" className="w-4 h-4" />
                        </button>
                      )}
                    </Can>
                    <Can permission="reviews.edit">
                      <Link
                        href={`/admin/edit-review/${review.id}`}
                        title="Edit review"
                        aria-label={`Edit review "${review.title}"`}
                        className={`${ACTION_BUTTON} hover:bg-slate-100 dark:hover:bg-white/5`}
                      >
                        <Icon name="edit-2" className="w-4 h-4" />
                      </Link>
                    </Can>
                    <Can permission="reviews.delete">
                      <button
                        type="button"
                        title="Delete review"
                        aria-label={`Delete review "${review.title}"`}
                        onClick={() => onDelete?.(review)}
                        disabled={isBusy}
                        className={`${ACTION_BUTTON} hover:bg-red-50 hover:text-error dark:hover:bg-red-500/10`}
                      >
                        <Icon name="trash-2" className="w-4 h-4" />
                      </button>
                    </Can>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
