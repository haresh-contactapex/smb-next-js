import CheckoutHeader from "@/components/storefront/checkout/CheckoutHeader";
import CheckoutFooter from "@/components/storefront/checkout/CheckoutFooter";
import CheckoutResult from "@/components/storefront/checkout/CheckoutResult";
import { resolveCheckoutResult, resolveCodResult } from "@/lib/checkoutOrders";

export const metadata = { title: "Order confirmation | shopmyband.com" };

// The outcome comes from Stripe, read on the server for every visit, so never prerender it.
export const dynamic = "force-dynamic";

// Where Stripe sends the customer after paying (and where the checkout goes itself when
// no redirect was needed). The URL carries the PaymentIntent's id and client secret;
// the secret has to match Stripe's, and the result shown is what Stripe says, not
// anything in the URL. Reading it also brings the order up to date (see resolveCheckoutResult).
export default async function CheckoutCompleteRoute({ searchParams }) {
  const params = await searchParams;
  const one = (value) => (Array.isArray(value) ? value[0] : value);
  // `cod` is a cash-on-delivery order's id; there is no gateway to ask about those.
  const codOrderId = one(params.cod);
  const result = codOrderId
    ? await resolveCodResult(codOrderId)
    : await resolveCheckoutResult({
        paymentIntentId: one(params.payment_intent),
        clientSecret: one(params.payment_intent_client_secret),
      });

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <CheckoutHeader />
      <CheckoutResult result={result} />
      <CheckoutFooter />
    </div>
  );
}
