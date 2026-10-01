import CheckoutHeader from "@/components/storefront/checkout/CheckoutHeader";
import CheckoutFooter from "@/components/storefront/checkout/CheckoutFooter";
import CheckoutPage from "@/components/storefront/checkout/CheckoutPage";
import { loadCheckoutSettings } from "@/lib/storefrontCheckout";

export const metadata = { title: "Checkout | shopmyband.com" };

// Reads live tax and payment settings, so never prerender it at build time.
export const dynamic = "force-dynamic";

// The storefront's header and footer are hidden on this route (StorefrontChrome);
// the checkout brings its own so a visitor stays focused on finishing the order.
export default async function CheckoutRoute() {
  const settings = await loadCheckoutSettings();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <CheckoutHeader />
      <CheckoutPage settings={settings} />
      <CheckoutFooter />
    </div>
  );
}
