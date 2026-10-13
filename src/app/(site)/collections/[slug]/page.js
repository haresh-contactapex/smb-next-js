import { notFound } from "next/navigation";
import ProductListing from "@/components/storefront/ProductListing";
import { STOREFRONT_PAGE_SIZE, listStorefrontFilterOptions, listStorefrontProductsPage } from "@/lib/products";
import { getVisibleCategoryBySlug } from "@/lib/categories";

// Reads live catalog data, so never prerender it at build time.
export const dynamic = "force-dynamic";

async function loadCategory(slug) {
  try {
    return { category: await getVisibleCategoryBySlug(slug), failed: false };
  } catch {
    return { category: null, failed: true };
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { category } = await loadCategory(slug);
  if (!category) return { title: "Collection | shopmyband.com" };
  return {
    title: category.seoTitle || `${category.name} | shopmyband.com`,
    description: category.seoDescription || undefined,
  };
}

// A category page: ACTIVE products in the category and its sub-categories.
// Hidden or unknown categories are a 404.
export default async function CollectionPage({ params }) {
  const { slug } = await params;
  const { category, failed: categoryFailed } = await loadCategory(slug);
  if (!category && !categoryFailed) notFound();

  let products = [];
  let total = 0;
  let filterOptions = { metals: [], sizes: [] };
  let failed = categoryFailed;
  if (category) {
    try {
      [{ products, total }, filterOptions] = await Promise.all([
        listStorefrontProductsPage({ limit: STOREFRONT_PAGE_SIZE, categorySlug: category.slug }),
        listStorefrontFilterOptions({ categorySlug: category.slug }).catch(() => filterOptions),
      ]);
    } catch {
      failed = true;
    }
  }

  // The category's own image (uploaded in admin), shown as a hero banner the same
  // way the Women Wedding Bands landing page does. A category without one yet
  // just skips the banner rather than showing an empty gray box. A `blob:` URL
  // is a stale browser-only preview that was never actually uploaded, so it can
  // never resolve here and is treated the same as no image.
  const heroImage = category?.imageUrl && !category.imageUrl.startsWith("blob:") ? category.imageUrl : null;

  return (
    <>
      {heroImage && (
        <div className="w-full fade-in-up delay-100">
          {/* Rounded top corners (matching the header's own curve into the announcement
              bar) read as the page's white background curving down into the photo. */}
          <div className="w-full h-[250px] sm:h-[300px] md:h-[400px] rounded-t-[32px] sm:rounded-t-[50px] bg-gray-200 overflow-hidden relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage}
              alt={category.name}
              className="w-full h-full object-cover object-center transform transition-transform duration-[10s] hover:scale-105"
            />
          </div>
        </div>
      )}

      <div
        className={`w-full bg-white fade-in-up ${
          heroImage ? "relative rounded-t-[2.5rem] sm:rounded-t-[4rem] -mt-10 sm:-mt-16 z-10 pt-10 sm:pt-14 delay-200" : "pt-10 sm:pt-14 delay-100"
        }`}
      >
        <div className="max-w-[1500px] mx-auto px-4 sm:px-8">
          <div className="text-center max-w-4xl mx-auto px-2">
            <h1
              className="text-[36px] sm:text-[46px] font-normal text-[#333333] mb-4 tracking-normal leading-tight"
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              {category?.name || "Collection"}
            </h1>
            {category?.description && <p className="leading-relaxed text-sm sm:text-[16px] whitespace-pre-line">{category.description}</p>}
          </div>

          <ProductListing
            initialProducts={products}
            initialTotal={total}
            pageSize={STOREFRONT_PAGE_SIZE}
            failed={failed}
            filterOptions={filterOptions}
            categorySlug={category?.slug || null}
          />
        </div>
      </div>
    </>
  );
}
