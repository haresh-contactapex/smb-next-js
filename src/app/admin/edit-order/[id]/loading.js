import EditOrderSkeleton from "@/components/orders/EditOrderSkeleton";

// Shown inside the admin shell while the page navigates in; EditOrderForm then
// renders the same skeleton while it fetches the order, so nothing flashes.
export default function Loading() {
  return <EditOrderSkeleton />;
}
