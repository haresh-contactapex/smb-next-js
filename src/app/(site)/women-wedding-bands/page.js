import ProductListing from "@/components/storefront/ProductListing";
import { STOREFRONT_PAGE_SIZE, listStorefrontProductsPage } from "@/lib/products";
import { getCurrencyTaxSettings } from "@/lib/currencyTaxSettings";

// Reads live catalog data, so never prerender it at build time.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Women Wedding Bands | shopmyband.com",
};

// The first page of ACTIVE products from the admin catalog; the listing loads
// the rest on demand ("Load more"). A database failure is reported to the
// visitor rather than silently showing an empty shop.
async function loadProducts() {
  try {
    const { products, total } = await listStorefrontProductsPage({ limit: STOREFRONT_PAGE_SIZE });
    return { products, total, failed: false };
  } catch {
    return { products: [], total: 0, failed: true };
  }
}

async function loadCurrency() {
  try {
    return (await getCurrencyTaxSettings())?.currency || "USD";
  } catch {
    return "USD";
  }
}

export default async function WomenWeddingBandsPage() {
  const [{ products, total, failed }, currency] = await Promise.all([loadProducts(), loadCurrency()]);

  return (
    <>
      {/* Hero banner */}
      <div className="w-full fade-in-up delay-100">
        <div className="w-full h-[250px] sm:h-[300px] md:h-[400px] bg-gray-200 overflow-hidden relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/storefront/wwb_top_banner.jpg"
            alt="Women wearing wedding bands"
            className="w-full h-full object-cover object-center transform transition-transform duration-[10s] hover:scale-105"
          />
        </div>
      </div>

      {/* Content container */}
      <div className="w-full relative bg-white rounded-t-[2.5rem] sm:rounded-t-[4rem] -mt-10 sm:-mt-16 z-10 pt-10 sm:pt-14 fade-in-up delay-200">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-8">
          <div className="text-center max-w-4xl mx-auto px-2">
            <h1
              className="text-[36px] sm:text-[46px] font-normal text-[#333333] mb-4 tracking-normal leading-tight"
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              Women Wedding Bands
            </h1>
            <p className="leading-relaxed mb-4 text-sm sm:text-[16px]">
              Explore a stunning collection of women&apos;s wedding bands at Shop My Band.
            </p>
            <p className="leading-relaxed max-w-4xl mx-auto hidden md:block text-sm sm:text-[16px]">
              Women&apos;s wedding bands are a significant symbol of commitment and love in marriage. These unique white gold,
              yellow gold, rose gold and platinum wedding bands for women are traditionally worn alongside the engagement
              ring. It symbolizes the eternal bond between partners. From traditional designs to modern and unique styles,
              Shop My Band offers a wide range of options to suit individual tastes and preferences.
            </p>
          </div>

          <ProductListing initialProducts={products} initialTotal={total} pageSize={STOREFRONT_PAGE_SIZE} currency={currency} failed={failed} />
        </div>
      </div>
    </>
  );
}
