import AccountPageHeader from "@/components/account/AccountPageHeader";
import AddressBook from "@/components/account/AddressBook";
import LoadFailed from "@/components/account/LoadFailed";
import { loadOrNull } from "@/lib/accountError";
import { requireCustomerPage } from "@/lib/auth/customerPage";
import { listCustomerAddresses } from "@/lib/customerAddresses";
import { listShippingCountries } from "@/lib/storefrontCart";

export const metadata = { title: "Addresses" };
export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const customer = await requireCustomerPage("/account/addresses");
  const addresses = await loadOrNull("addresses", () => listCustomerAddresses(customer.id));

  if (!addresses) {
    return (
      <>
        <AccountPageHeader title="Addresses" description="Where we send your orders, and where your cards are billed." />
        <LoadFailed what="addresses" retryHref="/account/addresses" />
      </>
    );
  }

  return <AddressBook initialAddresses={addresses} countries={listShippingCountries()} />;
}
