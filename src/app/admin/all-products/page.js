import ProductsPageToolbar from "@/components/all-products/ProductsPageToolbar";
import ProductsStats from "@/components/all-products/ProductsStats";
import ProductsListing from "@/components/all-products/ProductsListing";
import { listProducts } from "@/lib/products";
import { computeProductStats, pickIconColor } from "@/components/all-products/productHelpers";

export const metadata = {
  title: "All products · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

export default async function AllProductsPage() {
  const rows = await listProducts();
  const products = rows.map((row) => ({ ...row, iconColor: pickIconColor(row.id) }));
  const stats = computeProductStats(products);

  return (
    <>
      <ProductsPageToolbar />
      <ProductsStats stats={stats} />
      <ProductsListing products={products} />
    </>
  );
}
