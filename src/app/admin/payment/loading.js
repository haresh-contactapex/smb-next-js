import { FormPageSkeleton } from "@/components/admin-panel/Skeleton";

// Mirrors PaymentForm: saved-cards and add-card sections beside the billing
// address and accepted-payments sidebar.
export default function Loading() {
  return <FormPageSkeleton label="Loading payment methods…" main={[{ rows: 3 }, 4]} side={[3, 2]} />;
}
