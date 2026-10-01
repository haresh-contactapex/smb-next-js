"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { requestJson } from "../cart/cartApi";
import { mergeGuestWishlist } from "./wishlistApi";
import {
  MAX_WISHLIST_ITEMS,
  WISHLIST_STORAGE_KEY,
  normalizeWishlistItem,
  readStoredWishlist,
  sanitizeWishlist,
  wishlistKey,
  writeStoredWishlist,
} from "./wishlistHelpers";

const WishlistContext = createContext(null);

export function useWishlist() {
  const wishlist = useContext(WishlistContext);
  if (!wishlist) throw new Error("useWishlist must be used inside <WishlistProvider>.");
  return wishlist;
}

const REFRESH_INTERVAL_MS = 30000;
const NOTICE_MS = 3000;

// Wishlist state for the whole storefront. One list, two homes:
//  - a guest's list lives in localStorage (and syncs between tabs);
//  - a signed-in customer's list lives in the database, so it follows them to
//    any device. When the storefront finds a session it first merges whatever
//    the browser holds as a guest into the account, then shows the account list.
// Changes apply to the screen immediately and are rolled back if the server
// rejects them. The provider starts empty until mounted so the server and
// client render the same HTML.
export default function WishlistProvider({ children }) {
  const [items, setItems] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [notice, setNotice] = useState({ message: "", tone: "info" });

  // The refs are written together with the state (see commit) so two quick
  // taps in one frame still see each other's change.
  const itemsRef = useRef(items);
  const authRef = useRef(authenticated);
  const pendingRef = useRef(0); // account saves still in flight
  const lastRefreshRef = useRef(0);
  const noticeTimerRef = useRef(null);

  const commit = useCallback((updater) => {
    const next = typeof updater === "function" ? updater(itemsRef.current) : updater;
    itemsRef.current = next;
    setItems(next);
  }, []);

  const setSignedIn = useCallback((value) => {
    authRef.current = value;
    setAuthenticated(value);
  }, []);

  const notify = useCallback((message, tone = "info") => {
    setNotice({ message, tone });
    clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice({ message: "", tone }), NOTICE_MS);
  }, []);

  useEffect(() => () => clearTimeout(noticeTimerRef.current), []);

  // Asks the server whose list this is. A guest gets the browser's list back;
  // a customer gets their account list, with any guest items merged in first.
  // If the server can't be reached the current list is left as it is.
  const refresh = useCallback(async () => {
    lastRefreshRef.current = Date.now();
    const result = await requestJson("GET", "/api/wishlist");
    // A save in flight will leave the list in a fresher state than this answer describes.
    if (!result.ok || pendingRef.current > 0) return;

    if (!result.data?.authenticated) {
      setSignedIn(false);
      commit(readStoredWishlist());
      return;
    }

    const merged = await mergeGuestWishlist();
    setSignedIn(true);
    commit(sanitizeWishlist(merged.items || result.data.items));
  }, [commit, setSignedIn]);

  useEffect(() => {
    commit(readStoredWishlist());
    refresh().finally(() => setHydrated(true));
  }, [commit, refresh]);

  // Only a guest's list belongs in the browser; an account's stays on the server.
  useEffect(() => {
    if (hydrated && !authenticated) writeStoredWishlist(items);
  }, [items, hydrated, authenticated]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== WISHLIST_STORAGE_KEY && event.key !== null) return;
      if (authRef.current) return;
      // Another tab changed the guest list, or signed in and moved it to the account.
      commit(readStoredWishlist());
      refresh();
    };
    const refreshIfStale = () => {
      if (document.visibilityState === "hidden" || Date.now() - lastRefreshRef.current < REFRESH_INTERVAL_MS) return;
      refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refreshIfStale);
    document.addEventListener("visibilitychange", refreshIfStale);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refreshIfStale);
      document.removeEventListener("visibilitychange", refreshIfStale);
    };
  }, [commit, refresh]);

  // Sends one change to the account. Returns after undoing it on screen if the
  // server refused; a 401 means the session ended, so fall back to the guest list.
  const save = useCallback(
    async (method, body, { rollback, onSignedOut }) => {
      pendingRef.current += 1;
      const result = await requestJson(method, "/api/wishlist", body);
      pendingRef.current -= 1;
      if (result.ok) return;

      if (result.status === 401) {
        onSignedOut?.();
        notify("You've been signed out. Sign in again to keep your wishlist on your account.", "error");
        refresh();
        return;
      }
      rollback();
      notify(result.error, "error");
    },
    [notify, refresh]
  );

  // Saves a product (and, if chosen, the color/size). A guest keeps it in the browser.
  const add = useCallback(
    async (productId, variantId = null) => {
      const item = normalizeWishlistItem({ productId, variantId });
      if (!item || itemsRef.current.some((current) => current.key === item.key)) return;
      if (itemsRef.current.length >= MAX_WISHLIST_ITEMS) {
        notify(`Your wishlist is full (${MAX_WISHLIST_ITEMS} items). Remove something to save more.`, "error");
        return;
      }

      commit((current) => [item, ...current]);
      notify("Added to your wishlist");
      if (!authRef.current) return;

      await save("POST", { productId, variantId }, {
        rollback: () => commit((current) => current.filter((entry) => entry.key !== item.key)),
        // The session ended before this reached the account: keep it as a guest item instead of losing it.
        onSignedOut: () => writeStoredWishlist([item, ...readStoredWishlist().filter((entry) => entry.key !== item.key)]),
      });
    },
    [commit, notify, save]
  );

  // Removes the entry for this exact product + variant (a wishlist card's Remove).
  const remove = useCallback(
    async (productId, variantId = null) => {
      const list = itemsRef.current;
      const index = list.findIndex((entry) => entry.productId === productId && entry.variantId === variantId);
      if (index < 0) return;

      const removed = list[index];
      commit((current) => current.filter((entry) => entry.key !== removed.key));
      notify("Removed from your wishlist");
      if (!authRef.current) return;

      await save("DELETE", { productId: removed.productId, variantId: removed.variantId }, {
        rollback: () =>
          commit((current) =>
            current.some((entry) => entry.key === removed.key)
              ? current
              : [...current.slice(0, index), removed, ...current.slice(index)]
          ),
      });
    },
    [commit, notify, save]
  );

  // Removes every saved variant of a product (the heart on a card or the product page).
  const removeProduct = useCallback(
    async (productId) => {
      const removed = itemsRef.current.filter((entry) => entry.productId === productId);
      if (removed.length === 0) return;

      commit((current) => current.filter((entry) => entry.productId !== productId));
      notify("Removed from your wishlist");
      if (!authRef.current) return;

      await save("DELETE", { productId, allVariants: true }, {
        rollback: () => commit((current) => [...current, ...removed.filter((entry) => !current.some((other) => other.key === entry.key))]),
      });
    },
    [commit, notify, save]
  );

  // The customer picked another color/size for a saved item. If that variant is
  // already saved the two entries become one.
  const changeVariant = useCallback(
    async (productId, fromVariantId, toVariantId) => {
      const fromKey = wishlistKey(productId, fromVariantId);
      const toKey = wishlistKey(productId, toVariantId);
      const list = itemsRef.current;
      const index = list.findIndex((entry) => entry.key === fromKey);
      if (fromKey === toKey || index < 0) return;

      const original = list[index];
      const replacement = normalizeWishlistItem({ productId, variantId: toVariantId });
      const alreadySaved = list.some((entry) => entry.key === toKey);
      commit((current) =>
        alreadySaved ? current.filter((entry) => entry.key !== fromKey) : current.map((entry) => (entry.key === fromKey ? replacement : entry))
      );
      if (!authRef.current) return;

      await save("PATCH", { productId, variantId: fromVariantId, toVariantId }, {
        rollback: () =>
          commit((current) =>
            alreadySaved ? [...current.slice(0, index), original, ...current.slice(index)] : current.map((entry) => (entry.key === toKey ? original : entry))
          ),
      });
    },
    [commit, save]
  );

  const hasProduct = useCallback((productId) => items.some((entry) => entry.productId === productId), [items]);

  const value = useMemo(
    () => ({ items, count: items.length, hydrated, authenticated, hasProduct, add, remove, removeProduct, changeVariant }),
    [items, hydrated, authenticated, hasProduct, add, remove, removeProduct, changeVariant]
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={
          notice.message
            ? `fixed bottom-6 left-1/2 z-[60] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded px-5 py-3 text-center text-[14px] font-medium text-white shadow-lg ${
                notice.tone === "error" ? "bg-red-600" : "bg-[#333333]"
              }`
            : "sr-only"
        }
      >
        {notice.message}
      </div>
    </WishlistContext.Provider>
  );
}
