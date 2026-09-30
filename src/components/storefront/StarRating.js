const FILLED =
  "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";
const OUTLINE =
  "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z";

function FilledStar({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path d={FILLED} />
    </svg>
  );
}

function OutlineStar({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={OUTLINE} />
    </svg>
  );
}

// A half star is the outline with a filled copy of the same glyph clipped to
// its left half, so both halves share one shape.
function HalfStar({ className }) {
  return (
    <span className="relative inline-flex">
      <OutlineStar className={className} />
      <span className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
        <svg className={`${className} max-w-none`} fill="currentColor" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={OUTLINE} />
        </svg>
      </span>
    </span>
  );
}

// Five stars, rounded to the nearest half star. Decorative on its own; the
// wrapper carries the accessible rating text.
export default function StarRating({ rating = 0, className = "w-[18px] h-[18px]" }) {
  const value = Math.max(0, Math.min(5, Math.round(rating * 2) / 2));
  return (
    <span role="img" aria-label={`Rated ${rating ? rating.toFixed(1) : 0} out of 5`} className="flex text-[#ef9822]">
      {Array.from({ length: 5 }, (_, i) => {
        const fill = value - i;
        if (fill >= 1) return <FilledStar key={i} className={className} />;
        if (fill >= 0.5) return <HalfStar key={i} className={className} />;
        return <OutlineStar key={i} className={className} />;
      })}
    </span>
  );
}
