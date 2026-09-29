import Link from "next/link";

export const metadata = {
  title: "Coming Soon | shopmyband.com",
};

// Placeholder home page until the real storefront home is designed.
export default function ComingSoonPage() {
  return (
    <section className="flex items-center justify-center min-h-[60vh] px-4 sm:px-8 py-20 sm:py-28 fade-in-up">
      <div className="max-w-2xl text-center">
        <p className="text-xs sm:text-sm font-semibold tracking-[0.3em] uppercase text-[#ef9822] mb-5">Shop My Band</p>
        <h1
          className="text-[44px] sm:text-[64px] font-normal text-[#333333] leading-tight mb-6"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          Coming Soon
        </h1>
        <p className="leading-relaxed text-sm sm:text-[16px] mb-10">
          We&apos;re putting the finishing touches on our new website. In the meantime, browse our collection of women&apos;s
          wedding bands.
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
