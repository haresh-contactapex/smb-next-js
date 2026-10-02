import AccountPageHeader from "@/components/account/AccountPageHeader";
import WishlistPage from "@/components/storefront/wishlist/WishlistPage";
import { requireCustomerPage } from "@/lib/auth/customerPage";

export const metadata = { title: "Wishlist" };
export const dynamic = "force-dynamic";

// The same wishlist as /wishlist (it reads the signed-in customer's list), shown
// inside the account frame with a narrower grid to fit beside the menu.
export default async function AccountWishlistPage() {
  await requireCustomerPage("/account/wishlist");
  return (
    <>
      <AccountPageHeader title="Wishlist" description="Pieces you've saved. Pick a color or size and add them to your cart when you're ready." />
      <WishlistPage gridClassName="grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-3" />
    </>
  );
}
