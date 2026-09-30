import ListingPageSkeleton from "@/components/admin-panel/Skeleton";

// Shown inside the admin shell while page.js queries the coupons.
export default function Loading() {
  return (
    <ListingPageSkeleton
      label="Loading coupons…"
      actions={["w-40"]}
      stats={4}
      selects={["md:w-44", "md:w-44"]}
      columns={["stack", "text", "text", "text", "text", "badge", "actions"]}
    />
  );
}
