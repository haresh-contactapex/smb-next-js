import SearchResults from "@/components/storefront/search/SearchResults";
import { RESULTS_PAGE_SIZE, SEARCH_MAX_LENGTH, cleanSearchText } from "@/components/storefront/search/searchHelpers";
import StoreIcon from "@/components/storefront/icons";
import { searchStorefrontProducts } from "@/lib/products";

// Reads live catalog data, so never prerender it at build time.
export const dynamic = "force-dynamic";

// The search text comes from ?q=. A repeated ?q=a&q=b uses the first value.
const readQuery = (value) => cleanSearchText(Array.isArray(value) ? value[0] : value).slice(0, SEARCH_MAX_LENGTH);

export async function generateMetadata({ searchParams }) {
  const query = readQuery((await searchParams).q);
  return {
    title: query ? `Search: ${query} | shopmyband.com` : "Search | shopmyband.com",
    robots: { index: false, follow: true },
  };
}

// A database failure is reported to the visitor rather than shown as "no results".
async function loadResults(query) {
  try {
    return { ...(await searchStorefrontProducts({ query, limit: RESULTS_PAGE_SIZE })), failed: false };
  } catch (error) {
    console.error("Storefront search page failed", error);
    return { products: [], total: 0, failed: true };
  }
}

export default async function SearchPage({ searchParams }) {
  const query = readQuery((await searchParams).q);
  const results = query ? await loadResults(query) : null;

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 pt-10 sm:px-8 sm:pt-14">
      <div className="mx-auto max-w-2xl text-center fade-in-up">
        <h1
          className="mb-6 text-[36px] font-normal leading-tight tracking-normal text-[#333333] sm:text-[46px]"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          Search
        </h1>
        <form role="search" action="/search" method="get" className="relative">
          <input
            type="search"
            name="q"
            defaultValue={query}
            maxLength={SEARCH_MAX_LENGTH}
            placeholder="Search for rings, bands, SKUs…"
            aria-label="Search the store"
            autoComplete="off"
            enterKeyHint="search"
            className="w-full rounded-md border border-gray-300 bg-white py-3 pl-4 pr-14 text-[16px] text-[#333333] transition-shadow placeholder:text-gray-400 focus:border-[#ef9822] focus:outline-none focus:ring-1 focus:ring-[#ef9822] [&::-webkit-search-cancel-button]:hidden"
          />
          <button
            type="submit"
            aria-label="Search"
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#555555] transition-colors hover:text-[#ef9822]"
          >
            <StoreIcon name="search" />
          </button>
        </form>
      </div>

      <div className="pt-10 sm:pt-12">
        {results ? (
          // Keyed on the search text so a new search starts from its own first page.
          <SearchResults
            key={query}
            query={query}
            initialProducts={results.products}
            initialTotal={results.total}
            failed={results.failed}
          />
        ) : (
          <p className="py-10 text-center text-sm">Type a word above to search our collection.</p>
        )}
      </div>
    </div>
  );
}
