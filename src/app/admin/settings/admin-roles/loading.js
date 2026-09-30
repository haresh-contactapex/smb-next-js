import ListingPageSkeleton from "@/components/admin-panel/Skeleton";

// Shown inside the admin shell while page.js queries the roles. The add, edit
// and view pages below it override this with their own loading.js.
export default function Loading() {
  return (
    <ListingPageSkeleton
      label="Loading roles…"
      actions={["w-36"]}
      description
      selects={["md:w-44"]}
      columns={["stack", "text", "text", "text", "badge", "text", "text", "actions"]}
      pagination={false}
    />
  );
}
