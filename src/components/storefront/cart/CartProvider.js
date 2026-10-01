"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  CART_STORAGE_KEY,
  EMPTY_CART,
  NOTE_MAX_LENGTH,
  cartCount,
  cartTotals,
  clampQuantity,
  normalizeCartItem,
  readStoredCart,
  sanitizeCoupon,
  sanitizeShipping,
} from "./cartHelpers";
import { postJson } from "./cartApi";

const CartContext = createContext(null);

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("useCart must be used inside <CartProvider>.");
  return cart;
}

const productIdsOf = (items) => [...new Set(items.map((item) => item.productId))];

// Cart state for the whole storefront: the lines, the order note, the applied
// discount code and the shipping estimate. It is kept in localStorage (so it
// survives navigation and reloads, and syncs between tabs) and starts empty
// until mounted so the server and client render the same HTML.
export default function CartProvider({ countries = [], children }) {
  const [cart, setCart] = useState(EMPTY_CART);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [couponNotice, setCouponNotice] = useState("");

  const cartRef = useRef(cart);
  cartRef.current = cart;
  // "CODE|product,ids" last confirmed by the server, so applying a code
  // doesn't immediately trigger a second identical lookup.
  const checkedCouponRef = useRef("");

  useEffect(() => {
    setCart(readStoredCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === CART_STORAGE_KEY || event.key === null) setCart(readStoredCart());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const serialized = JSON.stringify(cart);
      if (window.localStorage.getItem(CART_STORAGE_KEY) !== serialized) window.localStorage.setItem(CART_STORAGE_KEY, serialized);
    } catch {
      // Storage full or blocked (private mode): the cart still works for this page view.
    }
  }, [cart, hydrated]);

  // A saved code can expire, run out, or (for category codes) need a different
  // eligible-product list once the cart changes, so re-check it against the
  // server whenever the code or the set of products in the cart changes.
  const couponCode = cart.coupon?.code || "";
  const productKey = productIdsOf(cart.items).sort().join(",");
  useEffect(() => {
    if (!hydrated || !couponCode || !productKey) return undefined;
    if (checkedCouponRef.current === `${couponCode}|${productKey}`) return undefined;

    const controller = new AbortController();
    postJson("/api/cart/coupon", { code: couponCode, productIds: productKey.split(",") }, controller.signal).then((result) => {
      if (result.aborted) return;
      if (result.ok) {
        checkedCouponRef.current = `${couponCode}|${productKey}`;
        const fresh = sanitizeCoupon(result.data);
        setCart((current) => (fresh && current.coupon?.code === couponCode ? { ...current, coupon: fresh } : current));
      } else if (result.status >= 400 && result.status < 500) {
        setCouponNotice(`${couponCode} was removed from your cart. ${result.error}`);
        setCart((current) => (current.coupon?.code === couponCode ? { ...current, coupon: null } : current));
      }
    });
    return () => controller.abort();
  }, [hydrated, couponCode, productKey]);

  // The saved shipping rules may predate a change in Settings -> Shipping.
  useEffect(() => {
    if (!hydrated) return;
    const saved = cartRef.current.shipping;
    if (!saved) return;
    postJson("/api/cart/shipping", { country: saved.country, zip: saved.zip }).then((result) => {
      if (!result.ok) return;
      setCart((current) =>
        current.shipping?.country === saved.country
          ? { ...current, shipping: sanitizeShipping({ ...result.data, selectedRateId: current.shipping.selectedRateId }) }
          : current
      );
    });
  }, [hydrated]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  // Adds one more of a product/variant, refreshing its price and stock limit
  // from the page it was added on, then shows the drawer.
  const addItem = useCallback((line) => {
    const incoming = normalizeCartItem({ ...line, quantity: 1 });
    if (!incoming) return;
    setCart((current) => {
      const existing = current.items.find((item) => item.key === incoming.key);
      if (!existing) return { ...current, items: [...current.items, incoming] };
      const quantity = clampQuantity(existing.quantity + 1, incoming);
      return { ...current, items: current.items.map((item) => (item.key === incoming.key ? { ...incoming, quantity } : item)) };
    });
    setIsOpen(true);
  }, []);

  const setQuantity = useCallback((key, quantity) => {
    setCart((current) => ({
      ...current,
      items: current.items.map((item) => (item.key === key ? { ...item, quantity: clampQuantity(quantity, item) } : item)),
    }));
  }, []);

  // Removing the last line starts a fresh cart, so an old note, code or
  // shipping estimate doesn't reappear on whatever is added next.
  const removeItem = useCallback((key) => {
    setCart((current) => {
      const items = current.items.filter((item) => item.key !== key);
      return items.length > 0 ? { ...current, items } : EMPTY_CART;
    });
    setCouponNotice("");
  }, []);

  // Switches a line to another variant of the same product (e.g. a different
  // color or size): price, stock limit and SKU come from the new variant, and
  // if the cart already has a line for it the two lines merge into one.
  const changeVariant = useCallback((key, variant) => {
    setCart((current) => {
      const line = current.items.find((item) => item.key === key);
      if (!line) return current;
      const changed = normalizeCartItem({
        ...line,
        variantId: variant.id,
        options: variant.options,
        sku: variant.sku,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice > variant.price ? variant.compareAtPrice : null,
        maxQuantity: variant.maxQuantity,
      });
      if (!changed || changed.key === key) return current;

      const target = current.items.find((item) => item.key === changed.key);
      if (!target) return { ...current, items: current.items.map((item) => (item.key === key ? changed : item)) };

      const merged = { ...changed, quantity: clampQuantity(target.quantity + line.quantity, changed) };
      return {
        ...current,
        items: current.items.filter((item) => item.key !== key).map((item) => (item.key === changed.key ? merged : item)),
      };
    });
  }, []);

  const setNote = useCallback((note) => {
    setCart((current) => ({ ...current, note: String(note).slice(0, NOTE_MAX_LENGTH) }));
  }, []);

  const applyCoupon = useCallback(async (code) => {
    const productIds = productIdsOf(cartRef.current.items);
    const result = await postJson("/api/cart/coupon", { code, productIds });
    if (!result.ok) return result;

    const coupon = sanitizeCoupon(result.data);
    if (!coupon) return { ok: false, error: "That discount code isn't valid." };
    checkedCouponRef.current = `${coupon.code}|${productIds.sort().join(",")}`;
    setCouponNotice("");
    setCart((current) => ({ ...current, coupon }));
    return { ok: true, coupon };
  }, []);

  const removeCoupon = useCallback(() => {
    setCouponNotice("");
    setCart((current) => ({ ...current, coupon: null }));
  }, []);

  const estimateShipping = useCallback(async ({ country, zip }) => {
    const result = await postJson("/api/cart/shipping", { country, zip });
    if (!result.ok) return result;

    setCart((current) => ({
      ...current,
      shipping: sanitizeShipping({ ...result.data, selectedRateId: current.shipping?.selectedRateId || "standard" }),
    }));
    return { ok: true };
  }, []);

  const clearShipping = useCallback(() => {
    setCart((current) => ({ ...current, shipping: null }));
  }, []);

  const selectShippingRate = useCallback((rateId) => {
    setCart((current) => (current.shipping ? { ...current, shipping: { ...current.shipping, selectedRateId: rateId } } : current));
  }, []);

  const count = cartCount(cart.items);
  const totals = useMemo(() => cartTotals(cart), [cart]);

  const value = useMemo(
    () => ({
      items: cart.items,
      note: cart.note,
      coupon: cart.coupon,
      shipping: cart.shipping,
      count,
      totals,
      countries,
      hydrated,
      isOpen,
      couponNotice,
      openCart,
      closeCart,
      addItem,
      setQuantity,
      changeVariant,
      removeItem,
      setNote,
      applyCoupon,
      removeCoupon,
      estimateShipping,
      clearShipping,
      selectShippingRate,
    }),
    [
      cart, count, totals, countries, hydrated, isOpen, couponNotice, openCart, closeCart, addItem, setQuantity, changeVariant, removeItem,
      setNote, applyCoupon, removeCoupon, estimateShipping, clearShipping, selectShippingRate,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
