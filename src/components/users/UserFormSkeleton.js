import { FormPageSkeleton } from "@/components/admin-panel/Skeleton";

// Mirrors UserForm (used by both Add and Edit User): details, access, password
// and preferences cards beside the info sidebar.
export default function UserFormSkeleton() {
  return (
    <FormPageSkeleton
      label="Loading user form…"
      main={[6, 2, 2, 2]}
      side={[3]}
    />
  );
}
