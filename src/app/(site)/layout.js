import { Playfair_Display } from "next/font/google";
import GoogleSansFont from "@/components/storefront/GoogleSansFont";
import TopBar from "@/components/storefront/TopBar";
import SiteHeader from "@/components/storefront/SiteHeader";
import SiteFooter from "@/components/storefront/SiteFooter";
import StorefrontChrome from "@/components/storefront/StorefrontChrome";
import CartProvider from "@/components/storefront/cart/CartProvider";
import CartDrawer from "@/components/storefront/cart/CartDrawer";
import WishlistProvider from "@/components/storefront/wishlist/WishlistProvider";
import { listShippingCountries } from "@/lib/storefrontCart";
import "./storefront.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-playfair",
});

// Public storefront shell: announcement bar / header / main container / footer
// as distinct bands. Always light — the admin dark-mode class on <html> doesn't apply here.
// Google Sans is the base font; Playfair Display is the display font for headings
// (applied inline via var(--font-playfair)).
// The cart provider wraps everything so the header icon, the product page's
// Add to Cart and the slide-out drawer share one cart.
export default function SiteLayout({ children }) {
  return (
    <div
      id="storefront-root"
      className={`${playfair.variable} font-google-sans min-h-screen flex flex-col bg-white text-[#555555] text-[16px] overflow-x-clip`}
    >
      <GoogleSansFont />
      <CartProvider countries={listShippingCountries()}>
        <WishlistProvider>
          <StorefrontChrome
            header={
              <>
                <TopBar />
                <SiteHeader />
              </>
            }
            footer={<SiteFooter />}
          >
            {children}
          </StorefrontChrome>
          <CartDrawer />
        </WishlistProvider>
      </CartProvider>
    </div>
  );
}
