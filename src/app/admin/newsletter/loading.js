import ListingPageSkeleton from "@/components/admin-panel/Skeleton";

// Shown inside the admin shell while page.js queries the subscribers.
export default function Loading() {
  return (
    <ListingPageSkeleton
      label="Loading subscribers…"
      actions={["w-28"]}
      stats={3}
      selects={[]}
      columns={["text", "badge", "text", "actions"]}
    />
  );
}
