import Breadcrumb from "@/components/storefront/Breadcrumb";
import WishlistPage from "@/components/storefront/wishlist/WishlistPage";

export const metadata = { title: "My Wishlist | shopmyband.com" };

// Everything on this page comes from the visitor's browser or account, read
// client-side by WishlistPage, so the route itself has no data to load.
export default function WishlistRoute() {
  return (
    <>
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Wishlist" }]} />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 pb-16">
        <h1
          className="text-[34px] sm:text-[40px] font-normal text-[#333333] tracking-normal leading-tight mb-8"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          My Wishlist
        </h1>
        <WishlistPage />
      </div>
    </>
  );
}
