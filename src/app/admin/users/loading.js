import ListingPageSkeleton from "@/components/admin-panel/Skeleton";

// Shown inside the admin shell while page.js queries the staff users.
export default function Loading() {
  return (
    <ListingPageSkeleton
      label="Loading users…"
      actions={["w-32"]}
      description
      selects={["md:w-44", "md:w-44"]}
      columns={["avatar", "text", "badge", "text", "badge", "text", "text", "actions"]}
    />
  );
}
