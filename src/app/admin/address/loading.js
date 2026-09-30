import { FormPageSkeleton } from "@/components/admin-panel/Skeleton";

// Mirrors AddressForm: billing and shipping cards beside the preview and
// delivery-instructions sidebar.
export default function Loading() {
  return <FormPageSkeleton label="Loading addresses…" main={[6, 6]} side={[3, 2]} />;
}
