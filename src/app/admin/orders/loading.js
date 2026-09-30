import ListingPageSkeleton from "@/components/admin-panel/Skeleton";

// Shown inside the admin shell while page.js queries the orders. The Pending,
// Processing, Completed and Cancelled pages share this layout, so they inherit it.
export default function Loading() {
  return (
    <ListingPageSkeleton
      label="Loading orders…"
      actions={["w-28"]}
      stats={5}
      selects={["md:w-44", "md:w-44"]}
      columns={["text", "text", "text", "text", "text", "badge", "badge", "actions"]}
    />
  );
}
