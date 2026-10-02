import AccountPageHeader from "@/components/account/AccountPageHeader";
import LoadFailed from "@/components/account/LoadFailed";
import PaymentMethods from "@/components/account/PaymentMethods";
import { loadOrNull } from "@/lib/accountError";
import { requireCustomerPage } from "@/lib/auth/customerPage";
import { listCustomerAddresses } from "@/lib/customerAddresses";
import { listCustomerPaymentMethods } from "@/lib/customerPaymentMethods";
import { loadCheckoutSettings } from "@/lib/storefrontCheckout";

export const metadata = { title: "Payment methods" };
export const dynamic = "force-dynamic";

export default async function PaymentMethodsPage() {
  const customer = await requireCustomerPage("/account/payment-methods");
  const [paymentMethods, addresses, checkout] = await Promise.all([
    loadOrNull("payment methods", () => listCustomerPaymentMethods(customer.id)),
    // Only used to pick a card's billing address, so the page works without it.
    loadOrNull("addresses", () => listCustomerAddresses(customer.id)),
    loadCheckoutSettings(),
  ]);

  if (!paymentMethods) {
    return (
      <>
        <AccountPageHeader title="Payment methods" description="The cards you've saved, so you can recognise and manage how you pay." />
        <LoadFailed what="saved cards" retryHref="/account/payment-methods" />
      </>
    );
  }

  return <PaymentMethods initialMethods={paymentMethods} addresses={addresses || []} acceptedMethods={checkout.paymentMethods} />;
}
