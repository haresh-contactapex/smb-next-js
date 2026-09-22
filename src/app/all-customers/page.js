import CustomersPageToolbar from "@/components/customers/CustomersPageToolbar";
import CustomersStats from "@/components/customers/CustomersStats";
import CustomersListing from "@/components/customers/CustomersListing";
import { listCustomers } from "@/lib/customers";
import { computeCustomerStats } from "@/components/customers/customerHelpers";

export const metadata = {
  title: "All Customers · Shop My Band Admin",
};

export const dynamic = "force-dynamic";

export default async function AllCustomersPage() {
  const customers = await listCustomers();
  const stats = computeCustomerStats(customers);

  return (
    <>
      <CustomersPageToolbar />
      <CustomersStats stats={stats} />
      <CustomersListing customers={customers} />
    </>
  );
}
