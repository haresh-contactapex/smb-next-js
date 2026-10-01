import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductGallery from "@/components/storefront/ProductGallery";
import ProductPurchasePanel from "@/components/storefront/ProductPurchasePanel";
import ProductTabs from "@/components/storefront/ProductTabs";
import RecentlyViewed from "@/components/storefront/RecentlyViewed";
import { getStorefrontProductByHandle } from "@/lib/products";
import { getPublicReviewsForProduct } from "@/lib/reviews";
import { getCurrencyTaxSettings } from "@/lib/currencyTaxSettings";
import { getStoreSettings } from "@/lib/storeSettings";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

// Reads live catalog data, so never prerender it at build time.
export const dynamic = "force-dynamic";

// Shared by generateMetadata and the page so the product is queried once per
// request. A database failure is kept apart from "no such product" so an outage
// doesn't masquerade as a 404.
const loadProduct = cache(async (handle) => {
  try {
    return { product: await getStorefrontProductByHandle(handle), failed: false };
  } catch (error) {
    console.error("Storefront product failed to load", error);
    return { product: null, failed: true };
  }
});

async function loadCurrency() {
  try {
    return (await getCurrencyTaxSettings())?.currency || "USD";
  } catch {
    return "USD";
  }
}

// Reviews and support email are extras: if their tables are missing or empty
// the product page should still render.
async function loadReviews(productId) {
  try {
    return await getPublicReviewsForProduct(productId);
  } catch {
    return { count: 0, average: 0, reviews: [] };
  }
}

async function loadSupportEmail() {
  try {
    return (await getStoreSettings()).supportEmail;
  } catch {
    return "";
  }
}

export async function generateMetadata({ params }) {
  const { handle } = await params;
  const { product } = await loadProduct(handle);
  if (!product) return { title: "Product | shopmyband.com" };
  return {
    title: product.seoTitle || `${product.title} | shopmyband.com`,
    description: product.seoDescription || undefined,
  };
}

export default async function ProductPage({ params }) {
  const { handle } = await params;
  const { product, failed } = await loadProduct(handle);

  if (failed) {
    return (
      <p role="status" className="text-center py-24 px-4 text-sm">
        We couldn&apos;t load this product right now. Please try again shortly, or{" "}
        <Link href="/women-wedding-bands" className="underline hover:text-[#ef9822]">
          browse all wedding bands
        </Link>
        .
      </p>
    );
  }
  if (!product) notFound();

  const [currency, reviews, supportEmail] = await Promise.all([
    loadCurrency(),
    loadReviews(product.id),
    loadSupportEmail(),
  ]);

  // Only what the client components need; the description and image list stay server-side.
  const { id, title, sku, price, compareAtPrice, attributes, options, variants } = product;
  const purchaseProduct = {
    id,
    handle: product.handle,
    image: product.images[0] || null,
    title,
    sku,
    price,
    compareAtPrice,
    attributes,
    options,
    variants,
  };
  const recentlyViewedEntry = {
    id,
    handle: product.handle,
    title,
    price,
    image: product.images[0] || null,
    hoverImage: product.images[1] || product.images[0] || null,
  };

  return (
    <>
      <nav aria-label="Breadcrumb" className="max-w-[1600px] mx-auto px-4 sm:px-8 py-6 text-[16px] text-gray-400 font-medium">
        <ol className="flex flex-wrap items-center">
          <li>
            <Link href="/" className="hover:text-[#ef9822] transition-colors">
              Home
            </Link>
          </li>
          <li aria-hidden="true" className="mx-1.5">
            &gt;
          </li>
          <li>
            <Link href="/women-wedding-bands" className="hover:text-[#ef9822] transition-colors">
              Women&apos;s Wedding Bands
            </Link>
          </li>
          <li aria-hidden="true" className="mx-1.5">
            &gt;
          </li>
          <li aria-current="page" className="text-gray-500">
            {title}
          </li>
        </ol>
      </nav>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 pb-16 fade-in-up delay-100">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
          <ProductGallery key={`gallery-${id}`} images={product.images} title={title} />
          <ProductPurchasePanel key={id} product={purchaseProduct} currency={currency} reviews={reviews} supportEmail={supportEmail} />
        </div>

        <ProductTabs key={id} descriptionHtml={sanitizeHtml(product.description)} reviews={reviews} />
      </div>

      <RecentlyViewed key={id} current={recentlyViewedEntry} currency={currency} />
    </>
  );
}
