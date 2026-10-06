import { FormPageSkeleton } from "@/components/admin-panel/Skeleton";

// Mirrors the import page: a toolbar with one button over a product card and
// an upload card.
export default function Loading() {
  return (
    <FormPageSkeleton
      label="Loading review import…"
      actions={["w-44"]}
      actionHeight="h-10"
      main={[{ media: true }, { media: true }]}
      maxWidth="max-w-5xl"
    />
  );
}
