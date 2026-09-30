import ProductDetailSkeleton from "@/components/storefront/ProductDetailSkeleton";

// Shown inside the storefront shell while page.js queries the database.
export default function Loading() {
  return <ProductDetailSkeleton />;
}
