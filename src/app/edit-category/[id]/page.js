import AddCategoryForm from "@/components/add-category/AddCategoryForm";
import { listCategories } from "@/lib/categories";

export const metadata = {
  title: "Edit category · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

export default async function EditCategoryPage({ params }) {
  const categories = await listCategories();
  return <AddCategoryForm categoryId={params.id} categories={categories} />;
}
