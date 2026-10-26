"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TOAST_AUTO_DISMISS_MS } from "./Toast";

// The state and timer behind a page's <Toast>. Spread `toast` into the component:
//
//   const { toast, showToast, dismissToast } = useToast();
//   ...
//   <Toast {...toast} onDismiss={dismissToast} />
//
// `showToast(message, "error")` replaces whatever is showing and restarts the countdown. The
// countdown lives here, so a Toast with the same `durationMs` (this hook passes it along in
// `toast`) always agrees with it, and it is cleared if the page unmounts first.
export function useToast({ durationMs = TOAST_AUTO_DISMISS_MS } = {}) {
  const [state, setState] = useState({ message: "", visible: false, variant: "success" });
  const timerRef = useRef(null);

  const dismissToast = useCallback(() => {
    clearTimeout(timerRef.current);
    setState((current) => ({ ...current, visible: false }));
  }, []);

  const showToast = useCallback(
    (message, variant = "success") => {
      setState({ message, visible: true, variant });
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setState((current) => ({ ...current, visible: false })), durationMs);
    },
    [durationMs]
  );

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { toast: { ...state, durationMs }, showToast, dismissToast };
}
