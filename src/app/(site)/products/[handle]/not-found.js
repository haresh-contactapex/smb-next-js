import Link from "next/link";

// Rendered by notFound() for an unknown, draft, or archived product handle.
export default function ProductNotFound() {
  return (
    <section className="flex items-center justify-center min-h-[50vh] px-4 sm:px-8 py-20 text-center">
      <div className="max-w-xl">
        <p className="text-xs sm:text-sm font-semibold tracking-[0.3em] uppercase text-[#ef9822] mb-4">Product not found</p>
        <h1
          className="text-[32px] sm:text-[44px] font-normal text-[#333333] leading-tight mb-4"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          We couldn&apos;t find that band
        </h1>
        <p className="leading-relaxed text-sm sm:text-[16px] mb-8">
          This product may have been removed or the link may be out of date.
        </p>
        <Link
          href="/women-wedding-bands"
          className="inline-block bg-[#ef9822] hover:bg-[#d9861a] text-white text-sm font-semibold tracking-wide uppercase px-8 py-3 rounded-md transition-colors"
        >
          Browse Wedding Bands
        </Link>
      </div>
    </section>
  );
}
