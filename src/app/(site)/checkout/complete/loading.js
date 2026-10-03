import CheckoutHeader from "@/components/storefront/checkout/CheckoutHeader";
import CheckoutFooter from "@/components/storefront/checkout/CheckoutFooter";

// Shown while the server asks Stripe how the payment went. The checkout's own
// loading.js is for the checkout form and would be the wrong shape here.
export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <CheckoutHeader />
      <div role="status" aria-busy="true" aria-live="polite" className="mx-auto flex w-full max-w-[640px] flex-1 flex-col items-center px-4 py-16 sm:py-24">
        <span className="sr-only">Confirming your payment…</span>
        <div className="shimmer h-16 w-16 rounded-full" />
        <div className="shimmer mt-8 h-8 w-72 max-w-full rounded" />
        <div className="shimmer mt-4 h-4 w-80 max-w-full rounded" />
        <div className="shimmer mt-2 h-4 w-64 max-w-full rounded" />
        <div className="shimmer mt-10 h-14 w-52 rounded-lg" />
      </div>
      <CheckoutFooter />
    </div>
  );
}
