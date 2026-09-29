import AddCustomerForm from "@/components/add-customer/AddCustomerForm";

export const metadata = {
  title: "Edit customer · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

export default function EditCustomerPage({ params }) {
  return <AddCustomerForm customerId={params.id} />;
}
