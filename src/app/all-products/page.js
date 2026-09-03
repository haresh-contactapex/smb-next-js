import ProductsPageToolbar from "@/components/all-products/ProductsPageToolbar";
import ProductsStats from "@/components/all-products/ProductsStats";
import ProductsListing from "@/components/all-products/ProductsListing";
import { products } from "@/data/allProductsData";
import { computeProductStats } from "@/components/all-products/productHelpers";

export const metadata = {
  title: "All products · Shop My Band Admin",
};

export default function AllProductsPage() {
  const stats = computeProductStats(products);

  return (
    <>
      <ProductsPageToolbar />
      <ProductsStats stats={stats} />
      <ProductsListing products={products} />
    </>
  );
}
