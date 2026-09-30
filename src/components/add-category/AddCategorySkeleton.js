import { FormPageSkeleton } from "@/components/admin-panel/Skeleton";

// Mirrors AddCategoryForm (used by both Add and Edit Category): details and SEO
// cards beside the hierarchy sidebar.
export default function AddCategorySkeleton() {
  return (
    <FormPageSkeleton
      label="Loading category form…"
      main={[{ fields: 3, textarea: true }, 3]}
      side={[3]}
    />
  );
}
