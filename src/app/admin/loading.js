import { GenericPageSkeleton } from "@/components/admin-panel/Skeleton";

// Fallback for any admin page that doesn't have its own loading.js. The
// standalone auth pages (login, forgot/reset password, logout) render without
// the admin shell and opt out with their own empty loading.js.
export default function Loading() {
  return <GenericPageSkeleton />;
}
