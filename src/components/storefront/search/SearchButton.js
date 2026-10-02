"use client";

import StoreIcon from "../icons";
import { useSearch } from "./SearchProvider";

// Header search icon: opens the search panel.
export default function SearchButton({ className = "" }) {
  const { isOpen, openSearch } = useSearch();

  return (
    <button type="button" onClick={openSearch} aria-label="Search" aria-haspopup="dialog" aria-expanded={isOpen} className={className}>
      <StoreIcon name="search" />
    </button>
  );
}
