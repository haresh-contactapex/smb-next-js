"use client";

import { useCallback, useState } from "react";
import { requestJson } from "../cart/cartApi";

// The engraving rules and fonts, fetched when the cart page's edit form is opened (and again each
// time, so a change in Settings -> Engraving is picked up). status:
//   idle | loading | ready | unavailable (engraving is off or has no font) | failed
export default function useEngravingConfig() {
  const [state, setState] = useState({ status: "idle", config: null });

  const load = useCallback(async () => {
    setState({ status: "loading", config: null });
    const result = await requestJson("GET", "/api/storefront/engraving");
    if (!result.ok) setState({ status: "failed", config: null });
    else setState(result.data ? { status: "ready", config: result.data } : { status: "unavailable", config: null });
  }, []);

  return { ...state, load };
}
