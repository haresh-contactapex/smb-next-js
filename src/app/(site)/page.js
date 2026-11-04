import Link from "next/link";
import HomeHighlights from "@/components/storefront/home/HomeHighlights";
import HomeNewsletter from "@/components/storefront/home/HomeNewsletter";
import { listStorefrontProductsPage } from "@/lib/products";
import { getHomePageContent } from "@/lib/homePage";
import { HERO_PHOTO_RATIOS } from "@/lib/shared/homePage";

// The page content is edited in the admin panel (CMS -> Home Page), and the highlights
// read the live catalog, so never prerender at build time.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Custom Wedding Bands for Men and Women | shopmyband.com",
  description:
    "Classic diamond wedding bands, men's wedding bands, eternity bands and more. Custom wedding bands for men and women from Shop My Band.",
};

const DISPLAY = { fontFamily: "var(--font-playfair), serif" };

// The hero's photo columns scroll vertically in opposite directions, endlessly: each
// column's list is rendered twice and the track slides by half its height (see
// .hero-scroll-up / .hero-scroll-down in storefront.css), so the loop has no jump.
// `left`/`width` are percentages of the photo block; `seconds` is the time per photo.
const HERO_LAYOUT = [
  { key: "photosLeft", direction: "up", seconds: 14, left: "0%", width: "47.5%" },
  { key: "photosRight", direction: "down", seconds: 16, left: "52.5%", width: "47.5%" },
];

const ASSURANCE_ICON_PATH = "/storefront/home/icons";

const SHOP_BUTTON =
  "inline-block bg-[#ef9822] hover:bg-[#d9861a] text-white text-xs font-semibold tracking-wide uppercase px-9 py-3 rounded-lg transition-colors";

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
  const [content, { mostLoved, newArrivals }] = await Promise.all([getHomePageContent(), loadHighlights()]);
  const { hero, perks, collections, story, assurances } = content;

  return (
    <>
      {/* Hero: text on the left; on large screens the photos fill the right 40% edge to edge. */}
      <section className="relative overflow-hidden fade-in-up lg:h-[clamp(420px,49.5vw,760px)]">
        <div className="px-4 sm:px-8 pt-10 pb-8 lg:absolute lg:inset-y-0 lg:left-0 lg:flex lg:w-[56%] lg:items-center lg:pl-[7.4vw] lg:pr-[3vw] lg:py-0">
          <div className="max-w-[560px]">
            <h1 className="text-[28px] sm:text-[34px] lg:text-[clamp(26px,3.3vw,50px)] font-normal leading-[1.12] text-[#222222]" style={DISPLAY}>
              {hero.titleLead}
              {hero.titleAccent && <span className="text-[1.15em] italic text-[#444444]"> {hero.titleAccent}</span>}
              {(hero.titleLead || hero.titleAccent) && <br />}
              {hero.title}
            </h1>
            <p className="mt-6 whitespace-pre-line text-[13px] lg:text-[clamp(12px,1.1vw,16px)] leading-relaxed">{hero.intro}</p>
            <Link href={hero.buttonHref} className={`${SHOP_BUTTON} mt-6`}>
              {hero.buttonLabel}
            </Link>
          </div>
        </div>
        <div className="group/hero relative h-[380px] sm:h-[460px] lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-[40.3%]">
          {HERO_LAYOUT.map((column) => (
            <div key={column.key} className="absolute inset-y-0 overflow-hidden" style={{ left: column.left, width: column.width }}>
              <div
                className={`hero-scroll-${column.direction} group-hover/hero:[animation-play-state:paused]`}
                style={{ animationDuration: `${hero[column.key].length * column.seconds}s` }}
              >
                {[0, 1].map((copy) => (
                  <div key={copy} aria-hidden={copy === 1 ? "true" : undefined}>
                    {hero[column.key].map((photo, index) => (
                      <div key={index} className="pb-3 sm:pb-4">
                        <div className={`${HERO_PHOTO_RATIOS[index % HERO_PHOTO_RATIOS.length]} overflow-hidden rounded-2xl bg-[#f3f1ee]`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photo.src} alt={copy === 1 ? "" : photo.alt} className="h-full w-full object-cover" style={{ objectPosition: photo.position }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Perks strip */}
      <section aria-label="Our promises" className="bg-[#f4f5f6]">
        <ul className="max-w-[1500px] mx-auto flex flex-wrap items-center justify-center gap-x-12 gap-y-2 px-4 py-4 text-[11px] sm:text-xs uppercase tracking-wide text-[#555555]">
          {perks.map((perk, index) => (
            <li key={index}>{perk}</li>
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
        <ul className="mt-4 sm:mt-6 flex snap-x items-center gap-6 overflow-x-auto px-4 sm:px-8 py-8 [scrollbar-width:none] lg:justify-center">
          {collections.map((item, index) => (
            <li key={index} className="w-[72%] shrink-0 snap-start sm:w-[34%] lg:w-[22%]">
              <Link
                href={item.href}
                className={`group relative block aspect-[3/4] overflow-hidden rounded-2xl bg-[#f3f1ee] transition-transform duration-500 ease-out hover:z-10 hover:scale-[1.08] focus-visible:z-10 focus-visible:scale-[1.08]`}
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

      {/* Our story. The "Since" text sits inside the content container, a fixed distance from the photo; the heading overlaps the photo. */}
      <section className="mt-16 sm:mt-24">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-8">
          <div
            className={`relative grid items-center gap-8 md:grid-cols-[1.1fr_1fr]${story.since ? " lg:pl-[calc(var(--since-size)*1.6+2rem)]" : ""}`}
            style={{ "--since-size": "clamp(44px,4.5vw,68px)" }}
          >
            {story.since && (
              <div aria-hidden="true" className="hidden lg:flex absolute inset-y-0 left-0 items-center">
                <p
                  className="text-center text-[length:var(--since-size)] uppercase leading-[0.8] text-[#222222] [writing-mode:vertical-rl] rotate-180"
                  style={DISPLAY}
                >
                  {/* One line per word ("Since" / "2001"), whatever the photo height. */}
                  {story.since.split(/\s+/).map((word, index) => (
                    <span key={index} className="block whitespace-nowrap">
                      {word}
                    </span>
                  ))}
                </p>
              </div>
            )}
            <div className="overflow-hidden rounded-2xl bg-[#f3f1ee]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={story.imageSrc} alt={story.imageAlt} className="h-[280px] sm:h-[320px] md:h-auto md:aspect-[4/3] w-full object-cover object-[75%_center]" />
            </div>
            <div className="max-w-[440px]">
              <p className="whitespace-pre-line text-xs sm:text-[13px] leading-relaxed">{story.text}</p>
              <h2
                className="relative z-10 mt-8 sm:mt-10 text-[32px] sm:text-[clamp(34px,3.4vw,50px)] font-normal uppercase leading-none tracking-tight text-[#222222] md:-ml-[22%]"
                style={DISPLAY}
              >
                {story.heading}
              </h2>
              <Link href={story.buttonHref} className={`${SHOP_BUTTON} mt-8`}>
                {story.buttonLabel}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Assurances + newsletter */}
      <section className="mt-16 sm:mt-24 bg-[#f4f3f1] py-10 sm:py-12">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-8">
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {assurances.map((item, index) => (
              <li key={index} className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${ASSURANCE_ICON_PATH}/${item.icon}.png`} alt="" aria-hidden="true" className="h-9 w-10 shrink-0 object-contain" />
                <div>
                  <h3 className="text-[12px] font-semibold text-[#333333]">{item.title}</h3>
                  <p className="mt-0.5 text-[11px] leading-snug">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-12 text-center">
            <h2 className="text-[26px] sm:text-[34px] font-normal text-[#333333]" style={DISPLAY}>
              {content.newsletterHeading}
            </h2>
            <HomeNewsletter />
          </div>
        </div>
      </section>
    </>
  );
}
