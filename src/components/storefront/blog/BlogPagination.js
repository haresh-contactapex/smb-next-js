import Link from "next/link";
import StoreIcon from "../icons";

const BASE = "flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-[14px] transition-colors";

// Page links under the blog listing. Page 1 is the bare path; the others are ?page=N.
export default function BlogPagination({ basePath, page, totalPages }) {
  if (totalPages <= 1) return null;
  const href = (n) => (n <= 1 ? basePath : `${basePath}?page=${n}`);
  const numbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav aria-label="Blog pages" className="mt-14 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link href={href(page - 1)} rel="prev" aria-label="Previous page" className={`${BASE} border-[#e5e7eb] text-[#333333] hover:border-[#ef9822] hover:text-[#ef9822]`}>
          <StoreIcon name="chevronLeft" className="h-4 w-4" />
        </Link>
      )}
      {numbers.map((n) =>
        n === page ? (
          <span key={n} aria-current="page" className={`${BASE} border-[#333333] bg-[#333333] text-white`}>
            {n}
          </span>
        ) : (
          <Link key={n} href={href(n)} aria-label={`Page ${n}`} className={`${BASE} border-[#e5e7eb] text-[#333333] hover:border-[#ef9822] hover:text-[#ef9822]`}>
            {n}
          </Link>
        )
      )}
      {page < totalPages && (
        <Link href={href(page + 1)} rel="next" aria-label="Next page" className={`${BASE} border-[#e5e7eb] text-[#333333] hover:border-[#ef9822] hover:text-[#ef9822]`}>
          <StoreIcon name="chevronRight" className="h-4 w-4" />
        </Link>
      )}
    </nav>
  );
}
