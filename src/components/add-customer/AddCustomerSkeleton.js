import { FormPageSkeleton } from "@/components/admin-panel/Skeleton";

// Mirrors AddCustomerForm (used by both Add and Edit Customer): the details
// card beside the account-settings sidebar.
export default function AddCustomerSkeleton() {
  return (
    <FormPageSkeleton
      label="Loading customer form…"
      main={[6, { fields: 4, textarea: true }]}
      side={[3]}
    />
  );
}
