import OrdersListSkeleton from "@/components/account/OrdersListSkeleton";

// Shown inside the account frame while page.js reads the customer's orders. The
// order detail page below has its own loading.js, so it doesn't show this list.
export default function Loading() {
  return <OrdersListSkeleton />;
}
