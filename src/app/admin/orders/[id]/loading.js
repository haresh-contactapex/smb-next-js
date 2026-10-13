import ViewOrderSkeleton from "@/components/orders/ViewOrderSkeleton";

// Without this the order page would show the orders list's skeleton (the folder's
// loading.js covers every page below it).
export default function Loading() {
  return <ViewOrderSkeleton />;
}
