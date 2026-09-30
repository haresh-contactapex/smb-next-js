import ListingPageSkeleton from "@/components/admin-panel/Skeleton";

// Shown inside the admin shell while page.js queries the categories.
export default function Loading() {
  return (
    <ListingPageSkeleton
      label="Loading categories…"
      actions={["w-36"]}
      stats={4}
      selects={["md:w-44"]}
      columns={["media", "text", "text", "badge", "actions"]}
    />
  );
}
