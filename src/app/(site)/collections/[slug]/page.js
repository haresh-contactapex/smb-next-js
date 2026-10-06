import { notFound } from "next/navigation";
import ProductListing from "@/components/storefront/ProductListing";
import { STOREFRONT_PAGE_SIZE, listStorefrontProductsPage } from "@/lib/products";
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
  let failed = categoryFailed;
  if (category) {
    try {
      ({ products, total } = await listStorefrontProductsPage({ limit: STOREFRONT_PAGE_SIZE, categorySlug: category.slug }));
    } catch {
      failed = true;
    }
  }

  return (
    <div className="w-full bg-white pt-10 sm:pt-14 fade-in-up delay-100">
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
          categorySlug={category?.slug || null}
        />
      </div>
    </div>
  );
}
