import Icon from "@/components/admin-panel/Icon";
import { RATING_MAX, formatRating } from "@/lib/reviewFields";

/**
 * One decorative star filled `fill` of the way (0 empty, 0.5 half, 1 full).
 * A filled copy sits on top of an empty one and is clipped from the left, so a
 * half star is the same glyph as its neighbours, just cut in half.
 */
export function Star({ fill = 0, className = "w-4 h-4" }) {
  return (
    <span aria-hidden="true" className="relative inline-block leading-none text-slate-300 dark:text-slate-600">
      <Icon name="star" className={`${className} block`} />
      {fill > 0 && (
        <span className="absolute inset-y-0 left-0 overflow-hidden text-warning" style={{ width: `${fill * 100}%` }}>
          <Icon name="star" className={`${className} block max-w-none fill-current`} />
        </span>
      )}
    </span>
  );
}

/** Read-only star row. The visible stars are decorative; screen readers get the text. */
export default function StarRating({ rating, className = "w-4 h-4" }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="sr-only">{`${formatRating(rating)} out of ${RATING_MAX} stars`}</span>
      {Array.from({ length: RATING_MAX }, (_, i) => (
        <Star key={i} fill={Math.min(1, Math.max(0, rating - i))} className={className} />
      ))}
    </span>
  );
}
