import Link from "next/link";
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
            Shopping Cart
          </li>
        </ol>
      </nav>

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
