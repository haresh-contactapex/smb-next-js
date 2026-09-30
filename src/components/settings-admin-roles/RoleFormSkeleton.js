import { FormPageSkeleton } from "@/components/admin-panel/Skeleton";

// Mirrors RoleForm and RoleView (add, edit and view a role): the role details
// card beside the info sidebar, then the full-width permission matrix.
export default function RoleFormSkeleton() {
  return (
    <FormPageSkeleton
      label="Loading role…"
      main={[{ fields: 3, textarea: true }]}
      side={[3]}
      below={[{ rows: 8 }]}
    />
  );
}
