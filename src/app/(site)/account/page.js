import AccountOverview from "@/components/account/AccountOverview";
import { loadOrNull } from "@/lib/accountError";
import { requireCustomerPage } from "@/lib/auth/customerPage";
import { listCustomerAddresses } from "@/lib/customerAddresses";
import { getCustomerOrderCounts, listCustomerOrders } from "@/lib/customerOrders";
import { listCustomerPaymentMethods } from "@/lib/customerPaymentMethods";
import { listWishlist } from "@/lib/wishlist";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const customer = await requireCustomerPage("/account");

  // Each part loads on its own: one that fails (say a table that hasn't been
  // migrated yet) shows a notice in its own spot instead of failing the page.
  const [counts, recentOrders, wishlist, addresses, paymentMethods] = await Promise.all([
    loadOrNull("order counts", () => getCustomerOrderCounts(customer.id)),
    loadOrNull("recent orders", () => listCustomerOrders(customer.id, { pageSize: 3 })),
    loadOrNull("wishlist", () => listWishlist(customer.id)),
    loadOrNull("addresses", () => listCustomerAddresses(customer.id)),
    loadOrNull("payment methods", () => listCustomerPaymentMethods(customer.id)),
  ]);

  return (
    <AccountOverview
      customer={customer}
      counts={counts}
      recentOrders={recentOrders}
      wishlistCount={wishlist ? wishlist.length : null}
      addresses={addresses}
      paymentMethods={paymentMethods}
    />
  );
}
