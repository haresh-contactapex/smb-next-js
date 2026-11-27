import EditOrderForm from "@/components/orders/EditOrderForm";

export const metadata = {
  title: "Edit order · Shop Wedding Band Admin",
};

export default function EditOrderPage({ params }) {
  return <EditOrderForm orderId={params.id} />;
}
