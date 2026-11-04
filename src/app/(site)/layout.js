import { Jomolhari, Birthstone_Bounce } from "next/font/google";
import GoogleSansFont from "@/components/storefront/GoogleSansFont";
import TopBar from "@/components/storefront/TopBar";
import SiteHeader from "@/components/storefront/SiteHeader";
import SiteFooter from "@/components/storefront/SiteFooter";
import StorefrontChrome from "@/components/storefront/StorefrontChrome";
import CartProvider from "@/components/storefront/cart/CartProvider";
import CartDrawer from "@/components/storefront/cart/CartDrawer";
import WishlistProvider from "@/components/storefront/wishlist/WishlistProvider";
import SearchProvider from "@/components/storefront/search/SearchProvider";
import SearchOverlay from "@/components/storefront/search/SearchOverlay";
import { listShippingCountries } from "@/lib/storefrontCart";
import "./storefront.css";

// Jomolhari from Google Fonts; next/font downloads and self-hosts it at build time.
const display = Jomolhari({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-display",
});

// Script face for the accent word in the home page hero ("love.").
const script = Birthstone_Bounce({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-script",
});

// Public storefront shell: announcement bar / header / main container / footer
// as distinct bands. Always light — the admin dark-mode class on <html> doesn't apply here.
// Google Sans is the base font; Jomolhari is the display font for headings
// (applied inline via var(--font-display)).
// The cart provider wraps everything so the header icon, the product page's
// Add to Cart and the slide-out drawer share one cart.
export default function SiteLayout({ children }) {
  return (
    <div
      id="storefront-root"
      className={`${display.variable} ${script.variable} font-google-sans min-h-screen flex flex-col bg-white text-[#555555] text-[16px] overflow-x-clip`}
    >
      <GoogleSansFont />
      <CartProvider countries={listShippingCountries()}>
        <WishlistProvider>
          <SearchProvider>
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
            <SearchOverlay />
          </SearchProvider>
        </WishlistProvider>
      </CartProvider>
    </div>
  );
}
