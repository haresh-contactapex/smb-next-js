"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

const SearchContext = createContext(null);

export function useSearch() {
  const search = useContext(SearchContext);
  if (!search) throw new Error("useSearch must be used inside <SearchProvider>.");
  return search;
}

// Open/closed state of the search panel, shared so the header icon and the
// mobile menu's Search entry can both open the one panel.
export default function SearchProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const openSearch = useCallback(() => setIsOpen(true), []);
  const closeSearch = useCallback(() => setIsOpen(false), []);

  const value = useMemo(() => ({ isOpen, openSearch, closeSearch }), [isOpen, openSearch, closeSearch]);

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}
