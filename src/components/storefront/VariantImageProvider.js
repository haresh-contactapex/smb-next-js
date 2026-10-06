"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const MAX_PRELOADED = 12;

const VariantImageContext = createContext({ variantImage: null, setVariantImage: () => {} });

// The photo of the variant currently selected on the product page, or null
// when it has none. Outside a provider this is a harmless no-op.
export function useVariantImage() {
  return useContext(VariantImageContext);
}

// Carries the selected variant's photo from the purchase panel (which owns the
// color/size choice) to the gallery. `initialImage` is the default variant's
// photo, worked out on the server with the same default the panel starts on,
// so the first paint already shows the right photo instead of swapping after
// hydration. `preload` is every distinct variant photo: they are fetched in the
// background so changing the color shows the new photo straight away.
export default function VariantImageProvider({ initialImage = null, preload = [], children }) {
  const [variantImage, setVariantImage] = useState(initialImage);

  useEffect(() => {
    preload.slice(0, MAX_PRELOADED).forEach((url) => {
      const image = new window.Image();
      image.src = url;
    });
  }, [preload]);

  const value = useMemo(() => ({ variantImage, setVariantImage }), [variantImage]);
  return <VariantImageContext.Provider value={value}>{children}</VariantImageContext.Provider>;
}
