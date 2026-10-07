import Breadcrumb from "@/components/storefront/Breadcrumb";
import CartPage from "@/components/storefront/cart/CartPage";
import { listStorefrontProducts } from "@/lib/products";
import { getCurrencyTaxSettings } from "@/lib/currencyTaxSettings";

export const metadata = { title: "Shopping Cart | shopmyband.com" };

// Reads live catalog and tax settings, so never prerender it at build time.
export const dynamic = "force-dynamic";

// More than the four that are shown: the cart lives in the visitor's browser,
// so the page drops the ones already in it.
const RECOMMENDED_CANDIDATES = 8;

// Both are extras: if the database is unavailable the cart should still work.
async function loadRecommended() {
  try {
    return (await listStorefrontProducts()).slice(0, RECOMMENDED_CANDIDATES);
  } catch (error) {
    console.error("Cart recommended products failed to load", error);
    return [];
  }
}

async function loadPricesIncludeTax() {
  try {
    return Boolean((await getCurrencyTaxSettings())?.pricesIncludeTax);
  } catch {
    return null;
  }
}

export default async function CartRoute() {
  const [recommended, pricesIncludeTax] = await Promise.all([loadRecommended(), loadPricesIncludeTax()]);

  return (
    <>
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Shopping Cart" }]} />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 pb-16">
        <h1
          className="text-[34px] sm:text-[40px] font-normal text-[#333333] tracking-normal leading-tight mb-8"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          Shopping Cart
        </h1>
        <CartPage recommended={recommended} pricesIncludeTax={pricesIncludeTax} />
      </div>
    </>
  );
}
