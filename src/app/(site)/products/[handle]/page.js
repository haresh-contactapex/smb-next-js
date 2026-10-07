import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductGallery from "@/components/storefront/ProductGallery";
import ProductPurchasePanel from "@/components/storefront/ProductPurchasePanel";
import ProductTabs from "@/components/storefront/ProductTabs";
import RecentlyViewed from "@/components/storefront/RecentlyViewed";
import VariantImageProvider from "@/components/storefront/VariantImageProvider";
import { orderedVariantImages } from "@/components/storefront/galleryImages";
import { defaultVariant } from "@/components/storefront/wishlist/wishlistHelpers";
import { getStorefrontProductByHandle } from "@/lib/products";
import { getPublicReviewsForProduct } from "@/lib/reviews";
import { getStoreSettings } from "@/lib/storeSettings";
import { getProductsSettings } from "@/lib/productsSettings";
import { getProductEngraving } from "@/lib/engraving";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { requireStaffPermission } from "@/lib/auth/staffPermissions";

// Reads live catalog data, so never prerender it at build time.
export const dynamic = "force-dynamic";

// Shared by generateMetadata and the page so the product is queried once per
// request. A database failure is kept apart from "no such product" so an outage
// doesn't masquerade as a 404.
const loadProduct = cache(async (handle, preview = false) => {
  try {
    // ?preview=1 lets signed-in staff with product access see DRAFT products;
    // everyone else only ever gets ACTIVE ones.
    const includeDraft = preview && (await requireStaffPermission("products.view")).ok;
    return { product: await getStorefrontProductByHandle(handle, { includeDraft }), failed: false };
  } catch (error) {
    console.error("Storefront product failed to load", error);
    return { product: null, failed: true };
  }
});

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

// Settings -> Products -> "Allow customer reviews". A missing settings row (fresh
// environment) falls back to the setting's default, which is on.
async function loadAllowReviews() {
  try {
    return (await getProductsSettings()).allowReviews !== false;
  } catch {
    return true;
  }
}

export async function generateMetadata({ params, searchParams }) {
  const { handle } = await params;
  const preview = (await searchParams).preview === "1";
  const { product } = await loadProduct(handle, preview);
  if (!product) return { title: "Product | shopmyband.com" };
  return {
    robots: preview ? { index: false, follow: false } : undefined,
    title: product.seoTitle || `${product.title} | shopmyband.com`,
    description: product.seoDescription || undefined,
  };
}

export default async function ProductPage({ params, searchParams }) {
  const { handle } = await params;
  const preview = (await searchParams).preview === "1";
  const { product, failed } = await loadProduct(handle, preview);

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

  // `engraving` is null unless Settings -> Engraving and this product's own setting say so.
  const [reviews, supportEmail, allowReviews, engraving] = await Promise.all([
    loadReviews(product.id),
    loadSupportEmail(),
    loadAllowReviews(),
    getProductEngraving(product.id),
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
  // The photo the page opens on is the default variant's own, using the same default
  // the purchase panel starts on, so there is no swap after the page loads.
  const startVariant = defaultVariant(purchaseProduct);
  const initialVariant = startVariant ? { id: startVariant.id, imageUrl: startVariant.imageUrl } : null;
  // Every color's photo, in option order, so the gallery can offer each one as a thumbnail.
  const variantImages = orderedVariantImages(purchaseProduct);
  const recentlyViewedEntry = {
    id,
    handle: product.handle,
    title,
    sku,
    price,
    compareAtPrice,
    hasVariants: variants.length > 0,
    image: product.images[0] || null,
    hoverImage: product.images[1] || product.images[0] || null,
  };

  return (
    <div>
      {product.status === "DRAFT" && (
        <p role="status" className="bg-amber-100 text-amber-900 text-center text-sm font-medium px-4 py-2">
          Draft preview &mdash; this product is not visible to customers until it is set to Active.
        </p>
      )}
      <nav aria-label="Breadcrumb" className="max-w-[1600px] mx-auto px-4 sm:px-8 py-6 text-[16px] text-gray-400 font-medium">
        <ol className="flex flex-wrap items-center">
          <li>
            <Link href="/" className="hover:text-[#ef9822] transition-colors">
              Home
            </Link>
          </li>
          <li aria-hidden="true" className="mx-2">
            /
          </li>
          <li>
            <Link href="/women-wedding-bands" className="hover:text-[#ef9822] transition-colors">
              Women&apos;s Wedding Bands
            </Link>
          </li>
          <li aria-hidden="true" className="mx-2">
            /
          </li>
          <li aria-current="page" className="text-gray-500">
            {title}
          </li>
        </ol>
      </nav>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 pb-16 fade-in-up delay-100">
        <VariantImageProvider key={`variant-image-${id}`} initialVariant={initialVariant}>
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
            <ProductGallery key={`gallery-${id}`} images={product.images} variantImages={variantImages} title={title} />
            <ProductPurchasePanel
              key={id}
              product={purchaseProduct}
              reviews={reviews}
              supportEmail={supportEmail}
              engraving={engraving ? { settings: engraving.settings, fonts: engraving.fonts } : null}
            />
          </div>
        </VariantImageProvider>

        <ProductTabs
          key={id}
          descriptionHtml={sanitizeHtml(product.description)}
          reviews={reviews}
          handle={product.handle}
          productTitle={title}
          allowReviews={allowReviews}
        />
      </div>

      <RecentlyViewed key={id} current={recentlyViewedEntry} />
    </div>
  );
}
