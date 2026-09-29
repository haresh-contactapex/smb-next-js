import AddCategoryForm from "@/components/add-category/AddCategoryForm";
import { listCategories } from "@/lib/categories";

export const metadata = {
  title: "Add category · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

export default async function AddCategoryPage() {
  const categories = await listCategories();
  return <AddCategoryForm categories={categories} />;
}
