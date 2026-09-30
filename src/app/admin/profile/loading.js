import { FormPageSkeleton } from "@/components/admin-panel/Skeleton";

// Mirrors ProfileForm: details and password cards beside the account-status
// and preferences sidebar.
export default function Loading() {
  return <FormPageSkeleton label="Loading profile…" main={[6, 3]} side={[3, 2]} />;
}
