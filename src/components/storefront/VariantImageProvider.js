"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

const VariantImageContext = createContext({ variantImage: null, variantKey: null, setVariant: () => {} });

// The variant currently selected on the product page: its own photo (or null
// when it has none) and its id. Outside a provider this is a harmless no-op.
export function useVariantImage() {
  return useContext(VariantImageContext);
}

const toSelected = (variant) => ({ id: variant?.id ?? null, imageUrl: variant?.imageUrl ?? null });

// Carries the selected variant from the purchase panel (which owns the
// color/size choice) to the gallery. `initialVariant` ({ id, imageUrl }) is the
// default variant, worked out on the server with the same default the panel
// starts on, so the first paint already shows the right photo instead of
// swapping after hydration.
export default function VariantImageProvider({ initialVariant = null, children }) {
  const [selected, setSelected] = useState(() => toSelected(initialVariant));

  const setVariant = useCallback((variant) => {
    const next = toSelected(variant);
    setSelected((current) => (current.id === next.id && current.imageUrl === next.imageUrl ? current : next));
  }, []);

  const value = useMemo(
    () => ({ variantImage: selected.imageUrl, variantKey: selected.id, setVariant }),
    [selected, setVariant]
  );
  return <VariantImageContext.Provider value={value}>{children}</VariantImageContext.Provider>;
}
