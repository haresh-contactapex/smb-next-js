import { FormPageSkeleton } from "@/components/admin-panel/Skeleton";

// Mirrors AddProductForm (used by both Add and Edit Product): details, media,
// pricing, inventory and shipping cards beside the status/organization sidebar.
export default function AddProductSkeleton() {
  return (
    <FormPageSkeleton
      label="Loading product form…"
      actions={["w-28", "w-20", "w-32"]}
      main={[{ fields: 3, textarea: true }, { media: true }, 3, 4, 3]}
      side={[2, 4, 2]}
    />
  );
}
