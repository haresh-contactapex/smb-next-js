import ListingPageSkeleton from "@/components/admin-panel/Skeleton";

// Shown inside the admin shell while page.js queries the products.
export default function Loading() {
  return (
    <ListingPageSkeleton
      label="Loading products…"
      actions={["w-24", "w-24", "w-36"]}
      stats={4}
      selects={["md:w-44", "md:w-52"]}
      columns={["media", "text", "text", "text", "badge", "actions"]}
    />
  );
}
