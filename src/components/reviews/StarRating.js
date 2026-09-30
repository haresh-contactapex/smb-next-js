import Icon from "@/components/admin-panel/Icon";
import { RATING_MAX } from "@/lib/reviewFields";

/** Read-only star row. The visible stars are decorative; screen readers get the text. */
export default function StarRating({ rating, className = "w-4 h-4" }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="sr-only">{`${rating} out of ${RATING_MAX} stars`}</span>
      {Array.from({ length: RATING_MAX }, (_, i) => (
        <span key={i} aria-hidden="true" className={i < rating ? "text-warning" : "text-slate-300 dark:text-slate-600"}>
          <Icon name="star" className={`${className} ${i < rating ? "fill-current" : ""}`} />
        </span>
      ))}
    </span>
  );
}
