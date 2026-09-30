import { FormPageSkeleton } from "@/components/admin-panel/Skeleton";

// Overrides the product list's skeleton: the import page is one narrow upload
// card under a toolbar with two sample downloads and a "Back" button.
export default function Loading() {
  return (
    <FormPageSkeleton
      label="Loading product import…"
      actions={["w-48", "w-52", "w-44"]}
      actionHeight="h-10"
      main={[{ media: true }]}
      maxWidth="max-w-3xl"
    />
  );
}
