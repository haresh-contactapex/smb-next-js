import Link from "next/link";
import StoreIcon from "../icons";

const CIRCLE = "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#333333] text-white transition-colors group-hover:bg-[#ef9822]";

// Links to the post before (older) and after (newer) this one in its category. Either can be missing.
export default function BlogPostNav({ previous, next }) {
  if (!previous && !next) return null;
  return (
    <nav aria-label="More posts" className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-0">
      <div className="sm:border-r sm:border-[#e5e7eb] sm:pr-6">
        {previous && (
          <Link href={previous.href} rel="prev" className="group flex items-center gap-4 text-[#333333] hover:text-[#ef9822]">
            <span className={CIRCLE}>
              <StoreIcon name="arrowRight" className="h-5 w-5 rotate-180" />
            </span>
            <span className="min-w-0">
              <span className="block text-[12px] uppercase tracking-wide text-[#888888]">Previous post</span>
              <span className="block text-[16px] leading-snug">{previous.title}</span>
            </span>
          </Link>
        )}
      </div>
      <div className="sm:pl-6">
        {next && (
          <Link href={next.href} rel="next" className="group flex items-center justify-end gap-4 text-right text-[#333333] hover:text-[#ef9822]">
            <span className="min-w-0">
              <span className="block text-[12px] uppercase tracking-wide text-[#888888]">Next post</span>
              <span className="block text-[16px] leading-snug">{next.title}</span>
            </span>
            <span className={CIRCLE}>
              <StoreIcon name="arrowRight" className="h-5 w-5" />
            </span>
          </Link>
        )}
      </div>
    </nav>
  );
}
