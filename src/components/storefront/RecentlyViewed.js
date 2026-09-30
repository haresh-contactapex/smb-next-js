"use client";

import { useEffect, useState } from "react";
import ProductCard from "./ProductCard";

const STORAGE_KEY = "smb:recently-viewed";
const STORED_LIMIT = 8;
const SHOWN_LIMIT = 4;

function readStored() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.id && item.handle && item.title) : [];
  } catch {
    return [];
  }
}

// Products this browser has opened, most recent first. The list lives only in
// localStorage; the current product is recorded after being excluded from view,
// and the section stays hidden until there is something else to show.
export default function RecentlyViewed({ current, currency }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const previous = readStored().filter((item) => item.id !== current.id);
    setItems(previous.slice(0, SHOWN_LIMIT));
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([current, ...previous].slice(0, STORED_LIMIT)));
    } catch {
      // Storage full or blocked (private mode): the section simply won't persist.
    }
  }, [current]);

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="recently-viewed-heading" className="max-w-[1600px] mx-auto px-4 sm:px-8 pb-20 border-t border-gray-100 pt-8">
      <h2
        id="recently-viewed-heading"
        className="text-center text-[24px] sm:text-[30px] font-normal text-[#333333] mb-12"
        style={{ fontFamily: "var(--font-playfair), serif" }}
      >
        Recently Viewed Products
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
        {items.map((item, index) => (
          <ProductCard key={item.id} product={item} currency={currency} delay={index * 100} />
        ))}
      </div>
    </section>
  );
}
