import Link from "next/link";
import WishlistPage from "@/components/storefront/wishlist/WishlistPage";

export const metadata = { title: "My Wishlist | shopmyband.com" };

// Everything on this page comes from the visitor's browser or account, read
// client-side by WishlistPage, so the route itself has no data to load.
export default function WishlistRoute() {
  return (
    <>
      <nav aria-label="Breadcrumb" className="max-w-[1600px] mx-auto px-4 sm:px-8 py-6 text-[16px] text-gray-400 font-medium">
        <ol className="flex flex-wrap items-center">
          <li>
            <Link href="/" className="hover:text-[#ef9822] transition-colors">
              Home
            </Link>
          </li>
          <li aria-hidden="true" className="mx-1.5">
            &gt;
          </li>
          <li aria-current="page" className="text-gray-500">
            Wishlist
          </li>
        </ol>
      </nav>

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
