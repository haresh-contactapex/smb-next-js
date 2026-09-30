import { FormPageSkeleton } from "@/components/admin-panel/Skeleton";

// Mirrors AddReviewForm (used by both Add and Edit Review): review details and
// reviewer cards beside the moderation sidebar.
export default function AddReviewSkeleton() {
  return (
    <FormPageSkeleton
      label="Loading review form…"
      main={[{ fields: 3, textarea: true }, 3]}
      side={[2]}
    />
  );
}
