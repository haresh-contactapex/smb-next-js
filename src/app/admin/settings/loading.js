import { FormPageSkeleton } from "@/components/admin-panel/Skeleton";

// Every settings page shares one shape: a toolbar with Discard/Save, two
// section cards and a sidebar card. The Roles & Permissions pages override this.
export default function Loading() {
  return <FormPageSkeleton label="Loading settings…" main={[4, 4]} side={[3]} />;
}
