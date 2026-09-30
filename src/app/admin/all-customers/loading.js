import ListingPageSkeleton from "@/components/admin-panel/Skeleton";

// Shown inside the admin shell while page.js queries the customers.
export default function Loading() {
  return (
    <ListingPageSkeleton
      label="Loading customers…"
      actions={["w-40"]}
      stats={4}
      selects={["md:w-44", "md:w-44"]}
      columns={["avatar", "text", "badge", "text", "badge", "text", "actions"]}
    />
  );
}
