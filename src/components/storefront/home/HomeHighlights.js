"use client";

import { useState } from "react";
import Link from "next/link";
import ProductCard from "@/components/storefront/ProductCard";

const TABS = [
  { key: "mostLoved", label: "Most Loved" },
  { key: "newArrivals", label: "New Arrivals" },
];

// "Shop the Highlights": a tabbed row of product cards. Both lists are loaded on the
// server, so switching tabs is instant.
export default function HomeHighlights({ mostLoved, newArrivals }) {
  const [active, setActive] = useState("mostLoved");
  const lists = { mostLoved, newArrivals };
  const products = lists[active];

  return (
    <div>
      <div role="tablist" aria-label="Product highlights" className="mb-6 flex items-center gap-6 text-sm">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={`highlights-tab-${tab.key}`}
            aria-selected={active === tab.key}
            aria-controls="highlights-panel"
            onClick={() => setActive(tab.key)}
            className={`pb-0.5 transition-colors hover:text-[#d4920a] ${
              active === tab.key ? "border-b border-[#333333] text-[#333333]" : "text-[#777777]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div id="highlights-panel" role="tabpanel" aria-labelledby={`highlights-tab-${active}`}>
        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {products.map((product, index) => (
              <ProductCard key={`${active}-${product.id}`} product={product} delay={index * 60} />
            ))}
          </div>
        ) : (
          <p className="py-10 text-center text-sm">
            New designs are on their way.{" "}
            <Link href="/women-wedding-bands" className="text-[#d4920a] underline">
              Browse all wedding bands
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
