import CategoriesPageToolbar from "@/components/categories/CategoriesPageToolbar";
import CategoriesStats from "@/components/categories/CategoriesStats";
import CategoriesListing from "@/components/categories/CategoriesListing";
import { categories } from "@/data/categoriesData";
import { products } from "@/data/allProductsData";
import { computeCategoryCounts, computeCategoryStats } from "@/components/categories/categoryHelpers";

export const metadata = {
  title: "Categories · Shop My Band Admin",
};

export default function CategoriesPage() {
  const categoriesWithCounts = computeCategoryCounts(categories, products);
  const stats = computeCategoryStats(categoriesWithCounts);

  return (
    <>
      <CategoriesPageToolbar />
      <CategoriesStats stats={stats} />
      <CategoriesListing categories={categoriesWithCounts} />
    </>
  );
}
