import { Montserrat, Playfair_Display } from "next/font/google";
import TopBar from "@/components/storefront/TopBar";
import SiteHeader from "@/components/storefront/SiteHeader";
import SiteFooter from "@/components/storefront/SiteFooter";
import StorefrontChrome from "@/components/storefront/StorefrontChrome";
import CartProvider from "@/components/storefront/cart/CartProvider";
import CartDrawer from "@/components/storefront/cart/CartDrawer";
import { listShippingCountries } from "@/lib/storefrontCart";
import "./storefront.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-playfair",
});

// Public storefront shell: announcement bar / header / main container / footer
// as distinct bands. Always light — the admin dark-mode class on <html> doesn't apply here.
// The cart provider wraps everything so the header icon, the product page's
// Add to Cart and the slide-out drawer share one cart.
export default function SiteLayout({ children }) {
  return (
    <div
      id="storefront-root"
      className={`${montserrat.variable} ${playfair.variable} min-h-screen flex flex-col bg-white text-[#555555] text-[16px] overflow-x-clip`}
      style={{ fontFamily: "var(--font-montserrat), sans-serif" }}
    >
      <CartProvider countries={listShippingCountries()}>
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
      </CartProvider>
    </div>
  );
}
