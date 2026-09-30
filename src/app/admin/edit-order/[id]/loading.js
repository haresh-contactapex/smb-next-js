import { FormPageSkeleton } from "@/components/admin-panel/Skeleton";

// Mirrors EditOrderForm: back link + title with Cancel/Save, then one narrow
// card with the customer summary and the two status dropdowns.
export default function Loading() {
  return (
    <FormPageSkeleton
      label="Loading order…"
      actions={["w-20", "w-32"]}
      actionHeight="h-10"
      main={[{ avatarRow: true, fields: 2, flat: true, untitled: true }]}
      maxWidth="max-w-2xl"
    />
  );
}
