"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { postJson } from "../cart/cartApi";

// Live details (price, stock, rating, colors and sizes) for every product on
// the wishlist, keyed by product id. Looked up once the wishlist has loaded,
// and again only for products it hasn't asked about yet. A product the server
// no longer sells simply has no entry once `loading` is false, and `failed` is
// set when the lookup couldn't be completed (`retry` tries again).
export default function useWishlistProducts(items, enabled) {
  const [products, setProducts] = useState({});
  const [checked, setChecked] = useState({});
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const checkedRef = useRef(checked);
  checkedRef.current = checked;

  const idsKey = [...new Set(items.map((item) => item.productId))].sort().join(",");

  useEffect(() => {
    if (!enabled || !idsKey) return undefined;
    const missing = idsKey.split(",").filter((id) => !checkedRef.current[id]);
    if (missing.length === 0) return undefined;

    const controller = new AbortController();
    postJson("/api/wishlist/products", { productIds: missing }, controller.signal).then((result) => {
      if (result.aborted) return;
      if (!result.ok || !Array.isArray(result.data?.products)) {
        setFailed(true);
        return;
      }
      setFailed(false);
      setProducts((current) => ({ ...current, ...Object.fromEntries(result.data.products.map((product) => [product.id, product])) }));
      setChecked((current) => ({ ...current, ...Object.fromEntries(missing.map((id) => [id, true])) }));
    });
    return () => controller.abort();
  }, [enabled, idsKey, attempt]);

  const loading = enabled && idsKey !== "" && !failed && idsKey.split(",").some((id) => !checked[id]);
  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((current) => current + 1);
  }, []);

  return { products, loading, failed, retry };
}
