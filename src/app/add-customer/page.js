import AddCustomerForm from "@/components/add-customer/AddCustomerForm";

export const metadata = {
  title: "Add customer · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

export default function AddCustomerPage() {
  return <AddCustomerForm />;
}
