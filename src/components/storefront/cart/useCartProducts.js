"use client";

import { useEffect, useRef, useState } from "react";
import { postJson } from "./cartApi";

// The option lists and variants of every product in the cart, keyed by product
// id, for the cart page's color / size pickers. Fetched once the cart has
// loaded, and again only if the cart gains a product it hasn't seen (removing
// a line needs no request). A product that is no longer sold simply has no
// entry, and `failed` is set when the lookup couldn't be completed. `loading`
// is true until the first answer (either way) arrives.
export default function useCartProducts(items, enabled) {
  const [products, setProducts] = useState({});
  const [failed, setFailed] = useState(false);
  const [settled, setSettled] = useState(false);
  const loadedRef = useRef(products);
  loadedRef.current = products;

  const idsKey = [...new Set(items.map((item) => item.productId))].sort().join(",");

  useEffect(() => {
    if (!enabled || !idsKey) return undefined;
    const ids = idsKey.split(",");
    if (ids.every((id) => loadedRef.current[id])) return undefined;

    const controller = new AbortController();
    postJson("/api/cart/variants", { productIds: ids }, controller.signal).then((result) => {
      if (result.aborted) return;
      setSettled(true);
      if (!result.ok || !Array.isArray(result.data)) {
        setFailed(true);
        return;
      }
      setFailed(false);
      setProducts((current) => ({ ...current, ...Object.fromEntries(result.data.map((product) => [product.id, product])) }));
    });
    return () => controller.abort();
  }, [enabled, idsKey]);

  return { products, failed, loading: enabled && Boolean(idsKey) && !settled };
}
