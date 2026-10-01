import CheckoutHeader from "@/components/storefront/checkout/CheckoutHeader";
import CheckoutFooter from "@/components/storefront/checkout/CheckoutFooter";
import CheckoutSkeleton from "@/components/storefront/checkout/CheckoutSkeleton";

// Shown while page.js reads the tax and payment settings. The checkout's own
// header and footer are static, so they appear right away around the shimmer
// (the store's header and footer are hidden on this route by StorefrontChrome).
export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <CheckoutHeader />
      <CheckoutSkeleton />
      <CheckoutFooter />
    </div>
  );
}
