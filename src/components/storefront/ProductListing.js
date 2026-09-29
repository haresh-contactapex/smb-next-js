"use client";

import { useMemo, useState } from "react";
import StoreIcon from "./icons";
import { formatCurrency } from "@/lib/currency";

const METALS = [
  { code: "14KR", color: "#E5B5A3" },
  { code: "18KR", color: "#E5B5A3" },
  { code: "14KW", color: "#E0E0E0" },
  { code: "18KW", color: "#E0E0E0" },
  { code: "14KY", color: "#E8C581" },
  { code: "18KY", color: "#E8C581" },
  { code: "PT", color: "#D4D4D4" },
];

const BAND_SIZES = ["5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10"];

const PRICE_INPUT =
  "w-full bg-gray-50 text-sm pl-7 pr-2 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 transition-shadow";

// Filter bar + product grid. Price filtering is live; metal and band size are
// captured in state ready for when products carry that data.
export default function ProductListing({ products, currency = "USD" }) {
  const [metals, setMetals] = useState([]);
  const [size, setSize] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const visible = useMemo(() => {
    const min = minPrice === "" ? 0 : Number(minPrice);
    const max = maxPrice === "" ? Infinity : Number(maxPrice);
    return products.filter((product) => product.price >= min && product.price <= max);
  }, [products, minPrice, maxPrice]);

  const toggleMetal = (code) =>
    setMetals((current) => (current.includes(code) ? current.filter((c) => c !== code) : [...current, code]));

  return (
    <>
      <section
        aria-label="Filters"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-12 border-t border-b border-gray-200 mt-10 sm:mt-12 py-8 fade-in-up delay-300"
      >
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
          <h3 className="text-sm font-semibold text-[#333333] mb-5">Metal Color</h3>
          <div className="flex flex-wrap justify-center sm:justify-start gap-4">
            {METALS.map((metal) => {
              const active = metals.includes(metal.code);
              return (
                <button
                  key={metal.code}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleMetal(metal.code)}
                  className="flex flex-col items-center gap-2 cursor-pointer group"
                >
                  <span
                    style={{ backgroundColor: metal.color }}
                    className={`w-5 h-5 rounded-full ring-1 ring-offset-2 transition-all ${
                      active ? "ring-[#ef9822]" : "ring-transparent group-hover:ring-gray-300"
                    }`}
                  />
                  <span className="text-[11px] font-medium">{metal.code}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
          <h3 className="text-sm font-semibold text-[#333333] mb-5">Price</h3>
          <div className="flex items-center justify-center sm:justify-start space-x-3 w-full">
            <div className="relative w-full max-w-[120px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">$</span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="0"
                aria-label="Minimum price"
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
                className={PRICE_INPUT}
              />
            </div>
            <span className="text-sm text-gray-400">to</span>
            <div className="relative w-full max-w-[120px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">$</span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="15000"
                aria-label="Maximum price"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                className={PRICE_INPUT}
              />
            </div>
          </div>
        </div>

        <fieldset className="flex flex-col items-center sm:items-start text-center sm:text-left sm:col-span-2 lg:col-span-1">
          <legend className="text-sm font-semibold text-[#333333] mb-5">Band Size</legend>
          <div className="grid grid-cols-6 gap-y-3 gap-x-4 sm:gap-x-6 text-sm w-full max-w-lg">
            {BAND_SIZES.map((value) => (
              <label key={value} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name="band_size"
                  value={value}
                  checked={size === value}
                  onChange={() => setSize(value)}
                  className="custom-radio"
                />
                <span className="text-[#555555] group-hover:text-[#ef9822] transition-colors">{value}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      {visible.length === 0 ? (
        <p className="text-center py-20 text-sm">No products match your filters.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 sm:gap-y-12 pt-10 sm:pt-12 pb-16 sm:pb-24">
          {visible.map((product, index) => (
            <ProductCard key={product.id} product={product} currency={currency} delay={Math.min(index, 4) * 100 + 300} />
          ))}
        </div>
      )}
    </>
  );
}

function ProductCard({ product, currency, delay }) {
  const layer =
    "absolute inset-0 flex items-center justify-center p-6 sm:p-8 bg-[#FAFAFA] transform transition-all duration-700 ease-out z-10";

  return (
    <div className="group cursor-pointer fade-in-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="relative bg-[#FAFAFA] rounded-md aspect-square overflow-hidden mb-3 sm:mb-4">
        <button type="button" aria-label="Add to wishlist" className="absolute top-3 right-3 sm:top-4 sm:right-4 hover:text-[#ef9822] transition-colors z-20">
          <StoreIcon name="heart" />
        </button>
        {product.image ? (
          <>
            {/* Hover image */}
            <div className={`${layer} opacity-0 group-hover:opacity-100 scale-110 group-hover:scale-100`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.hoverImage || product.image} alt="" className="object-contain mix-blend-multiply w-[90%] h-[90%]" />
            </div>
            {/* Base image */}
            <div className={`${layer} group-hover:opacity-0 group-hover:scale-95`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.image} alt={product.title} className="object-contain mix-blend-multiply w-[90%] h-[90%]" />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">No image</div>
        )}
      </div>
      <div className="text-left">
        <div className="font-semibold text-[#333333] mb-1">{formatCurrency(product.price, currency)}</div>
        <h3 className="leading-tight text-sm font-[600]">{product.title}</h3>
      </div>
    </div>
  );
}
