"use client";

import { useEffect, useRef, useState } from "react";

// Tracks whether an <img> has finished loading so a shimmer can sit behind it.
// A failed load also counts as done, so a broken image never shimmers forever.
export default function useImageLoaded() {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef(null);

  // The image may already be complete (cached) before React attaches onLoad.
  useEffect(() => {
    if (ref.current?.complete) setLoaded(true);
  }, []);

  return {
    loaded,
    imageProps: { ref, onLoad: () => setLoaded(true), onError: () => setLoaded(true) },
  };
}
