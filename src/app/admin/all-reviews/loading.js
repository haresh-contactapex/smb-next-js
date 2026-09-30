import ListingPageSkeleton from "@/components/admin-panel/Skeleton";

// Shown inside the admin shell while page.js queries the reviews.
export default function Loading() {
  return (
    <ListingPageSkeleton
      label="Loading reviews…"
      actions={["w-36"]}
      stats={4}
      selects={["md:w-44", "md:w-44"]}
      columns={["text", "stack", "text", "text", "text", "badge", "actions"]}
    />
  );
}
