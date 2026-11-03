import Link from "next/link";
import HomeHighlights from "@/components/storefront/home/HomeHighlights";
import HomeNewsletter from "@/components/storefront/home/HomeNewsletter";
import { listStorefrontProductsPage } from "@/lib/products";

// Highlights read the live catalog, so never prerender at build time.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Custom Wedding Bands for Men and Women | shopmyband.com",
  description:
    "Classic diamond wedding bands, men's wedding bands, eternity bands and more. Custom wedding bands for men and women from Shop My Band.",
};

const DISPLAY = { fontFamily: "var(--font-playfair), serif" };
const SHOP_BUTTON =
  "inline-block bg-[#ef9822] hover:bg-[#d9861a] text-white text-xs font-semibold tracking-wide uppercase px-5 py-2.5 rounded-[3px] transition-colors";

const HERO_PHOTOS = [
  { src: "/storefront/wwb_top_banner.jpg", alt: "Stacked diamond wedding bands", position: "72% center" },
  { src: "/storefront/classic-bands/hero.jpg", alt: "Couple wearing classic wedding bands" },
  { src: "/storefront/anniversary-bands/hero.jpg", alt: "Anniversary bands" },
  { src: "/storefront/wedding-bands/hero.jpg", alt: "Wedding bands" },
];

const PERKS = ["Free shipping to US", "30-day return policy", "Free lifetime cleaning & inspection"];

const COLLECTIONS = [
  { label: "Wedding Bands", href: "/women-wedding-bands", src: "/storefront/wedding-bands/hero.jpg" },
  { label: "Classic Bands", href: "/collections/classic-bands", src: "/storefront/classic-bands/womens-classic-wedding-bands.jpg" },
  {
    label: "Eternity Bands",
    href: "/collections/eternity-bands",
    src: "/storefront/anniversary-bands/womens-anniversary-bands.jpg",
    text: "Discover eternity bands featuring diamonds or gemstones that encircle the entire ring, creating a timeless symbol of everlasting love.",
  },
  { label: "Anniversary Bands", href: "/collections/anniversary-bands", src: "/storefront/anniversary-bands/hero.jpg" },
];

const ASSURANCES = [
  { icon: "diamond", title: "Certified by GIA", text: "A guarantee of quality and authenticity, you can trust." },
  { icon: "truck", title: "Free Shipping", text: "Ships across the United States at no additional cost." },
  { icon: "heart", title: "30-Day Return Policy", text: "Satisfaction guaranteed or your money back is our promise." },
  { icon: "shield", title: "Free Lifetime Cleaning & Inspection", text: "Professional services to maintain the safety and brilliance of your jewelry." },
];

// A failed lookup leaves the highlights empty rather than taking the home page down.
async function loadHighlights() {
  try {
    const [mostLoved, newArrivals] = await Promise.all([
      listStorefrontProductsPage({ limit: 4, sort: "bestselling" }),
      listStorefrontProductsPage({ limit: 4, sort: "date-desc" }),
    ]);
    return { mostLoved: mostLoved.products, newArrivals: newArrivals.products };
  } catch (error) {
    console.error("Home highlights failed to load", error);
    return { mostLoved: [], newArrivals: [] };
  }
}

export default async function HomePage() {
  const { mostLoved, newArrivals } = await loadHighlights();

  return (
    <>
      {/* Hero */}
      <section className="max-w-[1500px] mx-auto px-4 sm:px-8 pt-6 sm:pt-10 fade-in-up">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div className="max-w-xl">
            <h1 className="text-[30px] sm:text-[40px] font-normal leading-[1.15] text-[#333333]" style={DISPLAY}>
              A Lifetime of <span className="italic text-[#ef9822]">love,</span>
              <br />
              dedicated to creating custom wedding bands for men and women.
            </h1>
            <p className="mt-6 text-xs sm:text-[13px] leading-relaxed">
              Whether you&apos;re searching for classic diamond wedding bands, unique men&apos;s wedding bands, or gold wedding
              bands for women, Shop My Band has you covered. Our collection includes an array of stunning eternity bands, and
              more. If you&apos;re looking for a touch of luxury, we also offer rose gold wedding bands.
            </p>
            <Link href="/women-wedding-bands" className={`${SHOP_BUTTON} mt-6`}>
              Shop Now
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {HERO_PHOTOS.map((photo, index) => (
              <div key={photo.src} className={`overflow-hidden rounded-2xl bg-[#f3f1ee] aspect-[4/5] ${index % 2 === 1 ? "mt-6 sm:mt-10" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.src} alt={photo.alt} className="h-full w-full object-cover" style={photo.position ? { objectPosition: photo.position } : undefined} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Perks strip */}
      <section aria-label="Our promises" className="mt-10 sm:mt-14 bg-[#f4f5f6]">
        <ul className="max-w-[1500px] mx-auto flex flex-wrap items-center justify-center gap-x-12 gap-y-2 px-4 py-4 text-[11px] sm:text-xs uppercase tracking-wide text-[#555555]">
          {PERKS.map((perk) => (
            <li key={perk}>{perk}</li>
          ))}
        </ul>
      </section>

      {/* Collections */}
      <section className="mt-14 sm:mt-20">
        <div className="text-center px-4">
          <h2 className="text-[30px] sm:text-[44px] font-normal uppercase tracking-wide text-[#222222]" style={DISPLAY}>
            Explore Our Collections
          </h2>
          <p className="mt-2 text-xs sm:text-sm">From bespoke designs to beautifully crafted wedding bands.</p>
        </div>
        <ul className="mt-8 sm:mt-10 flex snap-x gap-4 overflow-x-auto px-4 sm:px-8 pb-2 [scrollbar-width:none] lg:justify-center">
          {COLLECTIONS.map((item) => (
            <li key={item.label} className="w-[72%] shrink-0 snap-start sm:w-[34%] lg:w-[22%]">
              <Link href={item.href} className="group relative block aspect-[3/4] overflow-hidden rounded-2xl bg-[#f3f1ee]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.src} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                {item.text ? (
                  <span className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 via-black/10 to-transparent p-5 text-white">
                    <span className="text-[26px] uppercase leading-tight" style={DISPLAY}>{item.label}</span>
                    <span className="mt-2 text-xs leading-relaxed">{item.text}</span>
                  </span>
                ) : (
                  <span className="sr-only">{item.label}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Highlights */}
      <section className="max-w-[1500px] mx-auto px-4 sm:px-8 mt-14 sm:mt-20">
        <h2 className="mb-4 text-[30px] sm:text-[44px] font-normal uppercase tracking-wide text-[#222222]" style={DISPLAY}>
          Shop the Highlights
        </h2>
        <HomeHighlights mostLoved={mostLoved} newArrivals={newArrivals} />
      </section>

      {/* Our story */}
      <section className="max-w-[1500px] mx-auto px-4 sm:px-8 mt-16 sm:mt-24">
        <div className="relative grid items-center gap-8 md:grid-cols-[1.1fr_1fr]">
          <p
            aria-hidden="true"
            className="hidden lg:block absolute -left-2 top-0 text-[80px] uppercase leading-none text-[#222222] [writing-mode:vertical-rl] rotate-180"
            style={DISPLAY}
          >
            Since 2001
          </p>
          <div className="overflow-hidden rounded-2xl bg-[#f3f1ee] lg:ml-24">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/storefront/wwb_top_banner.jpg" alt="Hand wearing stacked wedding bands" className="h-[280px] sm:h-[360px] w-full object-cover object-[75%_center]" />
          </div>
          <div className="max-w-lg">
            <p className="text-xs sm:text-[13px] leading-relaxed">
              shopmyband.com is a division of My Bridal Ring focused on custom wedding bands for men and women. My Bridal Ring
              is a manufacturer based in the Los Angeles area for over 25 years. It is family owned and operated with over 60
              years of combined experience from diamond manufacturing from rough diamonds to entire process of jewelry
              manufacturing.
            </p>
            <h2 className="mt-4 text-[34px] sm:text-[44px] font-normal uppercase leading-none text-[#222222]" style={DISPLAY}>
              Our Story
            </h2>
            <Link href="/women-wedding-bands" className={`${SHOP_BUTTON} mt-6`}>
              Shop Now
            </Link>
          </div>
        </div>
      </section>

      {/* Assurances + newsletter */}
      <section className="mt-16 sm:mt-24 bg-[#f4f3f1] py-10 sm:py-12">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-8">
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ASSURANCES.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/storefront/wedding-band-new/icons/${item.icon}.svg`} alt="" aria-hidden="true" className="mt-0.5 h-8 w-8 shrink-0" />
                <div>
                  <h3 className="text-[12px] font-semibold text-[#333333]">{item.title}</h3>
                  <p className="mt-0.5 text-[11px] leading-snug">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-12 text-center">
            <h2 className="text-[26px] sm:text-[34px] font-normal text-[#333333]" style={DISPLAY}>
              Stay in the Loop for discounts and offers
            </h2>
            <HomeNewsletter />
          </div>
        </div>
      </section>
    </>
  );
}
