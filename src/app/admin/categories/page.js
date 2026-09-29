import CategoriesPageToolbar from "@/components/categories/CategoriesPageToolbar";
import CategoriesStats from "@/components/categories/CategoriesStats";
import CategoriesListing from "@/components/categories/CategoriesListing";
import { listCategories } from "@/lib/categories";
import { computeCategoryStats, pickIconColor } from "@/components/categories/categoryHelpers";

export const metadata = {
  title: "Categories · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const rows = await listCategories();
  const categories = rows.map((row) => ({ ...row, imageColor: pickIconColor(row.id) }));
  const stats = computeCategoryStats(categories);

  return (
    <>
      <CategoriesPageToolbar />
      <CategoriesStats stats={stats} />
      <CategoriesListing categories={categories} />
    </>
  );
}
