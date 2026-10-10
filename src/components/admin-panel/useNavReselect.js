"use client";

import { useEffect, useRef } from "react";
import { NAV_RESELECT_EVENT } from "./adminPanelActions";

// Runs `onReselect` when its own sidebar entry is clicked while the page is already open
// (Next keeps the page mounted then, so a list would otherwise keep its filters).
// Use it to put a list's filters, sort, page and selection back to a fresh visit's state.
export default function useNavReselect(onReselect) {
  const latest = useRef(onReselect);
  latest.current = onReselect;

  useEffect(() => {
    const handle = () => latest.current();
    window.addEventListener(NAV_RESELECT_EVENT, handle);
    return () => window.removeEventListener(NAV_RESELECT_EVENT, handle);
  }, []);
}
