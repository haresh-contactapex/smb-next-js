import ProductListingSkeleton from "@/components/storefront/ProductListingSkeleton";

// Shown inside the storefront shell while page.js queries the database.
export default function Loading() {
  return <ProductListingSkeleton />;
}
