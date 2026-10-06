import Icon from "@/components/admin-panel/Icon";
import StarRating from "@/components/reviews/StarRating";

const CHECK_STYLES = {
  match: "bg-green-50 dark:bg-green-500/10 text-green-800 dark:text-green-300 border-green-200 dark:border-green-500/20",
  unknown: "bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/20",
  mismatch: "bg-red-50 dark:bg-red-500/10 text-red-800 dark:text-red-300 border-red-200 dark:border-red-500/20",
};
const CHECK_ICONS = { match: "check-circle", unknown: "alert-triangle", mismatch: "x-circle" };

function resultFor(review) {
  if (review.duplicate === "existing") return { label: "Skipped — already exists", tone: "text-slate-500 dark:text-slate-400" };
  if (review.duplicate === "file") return { label: "Skipped — repeated in file", tone: "text-slate-500 dark:text-slate-400" };
  if (!review.importable) return { label: "Skipped — has errors", tone: "text-error" };
  return { label: "Will import", tone: "text-success" };
}

function Stat({ value, label, tone = "text-slate-800 dark:text-white" }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 px-4 py-3">
      <p className={`text-xl font-bold ${tone}`}>{value}</p>
      <p className="text-[12px] text-slate-400">{label}</p>
    </div>
  );
}

/** The dry-run result: what the file contains and what an import would do. */
export default function ImportPreview({ preview, confirmMismatch, onConfirmMismatchChange, disabled }) {
  const { counts, productCheck, warnings, reviews, product } = preview;
  const skipped = counts.total - counts.importable;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat value={counts.total} label="Reviews found" />
        <Stat value={counts.importable} label="Will be imported" tone="text-success" />
        <Stat value={counts.duplicates} label="Duplicates skipped" />
        <Stat value={counts.withErrors} label="With errors" tone={counts.withErrors ? "text-error" : undefined} />
      </div>

      <div
        className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${CHECK_STYLES[productCheck.status]}`}
        role="status"
      >
        <Icon name={CHECK_ICONS[productCheck.status]} className="w-4 h-4 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p>{productCheck.message}</p>
          {productCheck.status === "mismatch" && (
            <label className="toggle-row mt-2 text-[13px] font-medium">
              <input
                type="checkbox"
                checked={confirmMismatch}
                disabled={disabled}
                onChange={(e) => onConfirmMismatchChange(e.target.checked)}
              />
              These reviews do belong to “{product.title}” — import them anyway
            </label>
          )}
        </div>
      </div>

      {warnings.map((warning) => (
        <p key={warning} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
          <Icon name="alert-triangle" className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {warning}
        </p>
      ))}

      <div className="overflow-x-auto custom-scroll border border-slate-200 dark:border-white/10 rounded-xl">
        <table className="w-full text-xs min-w-[760px]">
          <caption className="sr-only">Reviews found in the document</caption>
          <thead className="bg-slate-50 dark:bg-darksurface2/60 text-slate-500 dark:text-slate-400">
            <tr>
              <th scope="col" className="text-left font-semibold px-3 py-2 w-10">#</th>
              <th scope="col" className="text-left font-semibold px-3 py-2">Rating</th>
              <th scope="col" className="text-left font-semibold px-3 py-2">Reviewer</th>
              <th scope="col" className="text-left font-semibold px-3 py-2">Title</th>
              <th scope="col" className="text-left font-semibold px-3 py-2">Review</th>
              <th scope="col" className="text-left font-semibold px-3 py-2">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5 align-top">
            {reviews.map((review) => {
              const result = resultFor(review);
              return (
                <tr key={review.index}>
                  <td className="px-3 py-2 text-slate-400">{review.index}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {review.rating === null ? (
                      <span className="text-error">Invalid</span>
                    ) : (
                      <StarRating rating={review.rating} className="w-3.5 h-3.5" />
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-200 max-w-[10rem] truncate">{review.displayName}</td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-200 max-w-[14rem]">
                    <span className="block truncate">{review.title || "—"}</span>
                    {review.titleDerived && <span className="text-[10px] text-slate-400">made from the review text</span>}
                  </td>
                  <td className="px-3 py-2 text-slate-500 dark:text-slate-400 max-w-xs">
                    <span className="block line-clamp-2">{review.content || "—"}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`font-semibold ${result.tone}`}>{result.label}</span>
                    {review.issues.map((issue) => (
                      <span
                        key={issue.message}
                        className={`block mt-0.5 ${
                          issue.level === "error" ? "text-error" : "text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        {issue.message}
                      </span>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {skipped > 0 && (
        <p className="text-xs text-slate-400">
          {skipped} review{skipped === 1 ? "" : "s"} will be skipped; the rest are imported together or not at all.
        </p>
      )}
    </div>
  );
}
