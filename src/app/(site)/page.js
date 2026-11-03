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

// Two staggered columns bleeding off the hero's top, bottom and right edges. Positions
// are percentages of the photo block (left/width) and of the hero height (top/height).
const HERO_COLUMNS = [
  {
    left: "0%",
    width: "43.7%",
    photos: [
      { src: "/storefront/wedding-band-new/hero.jpg", alt: "Hands wearing wedding bands", top: "0%", height: "9%", round: "rounded-b-2xl", position: "center 80%" },
      { src: "/storefront/wedding-bands/hero.jpg", alt: "Woman wearing stacked wedding bands", top: "22.6%", height: "59.7%", round: "rounded-2xl", position: "60% center" },
      { src: "/storefront/anniversary-bands/hero.jpg", alt: "Anniversary bands", top: "88%", height: "12%", round: "rounded-t-2xl", position: "center 30%" },
    ],
  },
  {
    left: "49.4%",
    width: "50.6%",
    photos: [
      { src: "/storefront/wwb_top_banner.jpg", alt: "Hand holding stacked diamond bands", top: "0%", height: "37%", round: "rounded-b-2xl", position: "72% center" },
      { src: "/storefront/classic-bands/hero.jpg", alt: "Couple wearing wedding bands", top: "42.5%", height: "57.5%", round: "rounded-t-2xl", position: "45% center" },
    ],
  },
];

const PERKS = ["Free shipping to US", "30-day return policy", "Free lifetime cleaning & inspection"];

// `ratio` varies the tile heights so the row looks staggered, as in the design.
const COLLECTIONS = [
  {
    label: "Wedding Bands",
    href: "/women-wedding-bands",
    src: "/storefront/wedding-bands/hero.jpg",
    ratio: "aspect-[3/4]",
    text: "Custom wedding bands for men and women, crafted in white, yellow and rose gold and platinum.",
  },
  {
    label: "Classic Bands",
    href: "/collections/classic-bands",
    src: "/storefront/classic-bands/womens-classic-wedding-bands.jpg",
    ratio: "aspect-[5/7]",
    text: "Timeless plain and comfort-fit bands in polished, matte and brushed finishes.",
  },
  {
    label: "Eternity Bands",
    href: "/collections/eternity-bands",
    src: "/storefront/anniversary-bands/womens-anniversary-bands.jpg",
    ratio: "aspect-[11/14]",
    text: "Discover eternity bands featuring diamonds or gemstones that encircle the entire ring, creating a timeless symbol of everlasting love.",
  },
  {
    label: "Anniversary Bands",
    href: "/collections/anniversary-bands",
    src: "/storefront/anniversary-bands/hero.jpg",
    ratio: "aspect-[4/5]",
    text: "Celebrate every milestone with diamond anniversary bands made to be worn for a lifetime.",
  },
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
      {/* Hero: text on the left; on large screens the photos fill the right 40% edge to edge. */}
      <section className="relative overflow-hidden fade-in-up lg:h-[clamp(420px,49.5vw,760px)]">
        <div className="px-4 sm:px-8 pt-10 pb-8 lg:absolute lg:inset-y-0 lg:left-0 lg:flex lg:w-[56%] lg:items-center lg:pl-[7.4vw] lg:pr-[3vw] lg:py-0">
          <div className="max-w-[560px]">
            <h1 className="text-[28px] sm:text-[34px] lg:text-[clamp(26px,3.3vw,50px)] font-normal leading-[1.12] text-[#222222]" style={DISPLAY}>
              A Lifetime of <span className="text-[1.15em] italic text-[#444444]">love.</span>
              <br />
              dedicated to creating custom wedding bands for men and women.
            </h1>
            <p className="mt-6 text-[13px] lg:text-[clamp(12px,1.1vw,16px)] leading-relaxed">
              Whether you&apos;re searching for classic diamond wedding bands, unique men&apos;s wedding bands, or gold wedding
              bands for women, Shop My Band has you covered. Our collection includes an array of stunning eternity bands, and
              more. If you&apos;re looking for a touch of luxury, we also offer rose gold wedding bands.
            </p>
            <Link href="/women-wedding-bands" className={`${SHOP_BUTTON} mt-6`}>
              Shop Now
            </Link>
          </div>
        </div>
        <div className="relative h-[380px] sm:h-[460px] lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-[40.3%]">
          {HERO_COLUMNS.map((column) => (
            <div key={column.left} className="absolute inset-y-0" style={{ left: column.left, width: column.width }}>
              {column.photos.map((photo) => (
                <div key={photo.src} className={`absolute inset-x-0 overflow-hidden bg-[#f3f1ee] ${photo.round}`} style={{ top: photo.top, height: photo.height }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.src} alt={photo.alt} className="h-full w-full object-cover" style={{ objectPosition: photo.position }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Perks strip */}
      <section aria-label="Our promises" className="bg-[#f4f5f6]">
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
        <ul className="mt-4 sm:mt-6 flex snap-x items-center gap-4 overflow-x-auto px-4 sm:px-8 py-8 [scrollbar-width:none] lg:justify-center">
          {COLLECTIONS.map((item) => (
            <li key={item.label} className="w-[72%] shrink-0 snap-start sm:w-[34%] lg:w-[22%]">
              <Link
                href={item.href}
                className={`group relative block ${item.ratio} overflow-hidden rounded-2xl bg-[#f3f1ee] transition-transform duration-500 ease-out hover:z-10 hover:scale-110 focus-visible:z-10 focus-visible:scale-110`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.src} alt="" className="h-full w-full object-cover" />
                {/* Hidden until hovered or focused; touch screens have no hover, so it is always shown there. */}
                <span className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/25 to-black/10 p-5 text-white opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100">
                  <span className="text-[26px] uppercase leading-tight" style={DISPLAY}>{item.label}</span>
                  <span className="mt-2 text-xs leading-relaxed">{item.text}</span>
                </span>
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
