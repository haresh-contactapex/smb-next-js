"use client";

import { useState } from "react";
import Icon from "@/components/admin-panel/Icon";
import { SOFT_COLOR_CLASSES } from "@/components/dashboard/colorClasses";

// The product's main image, falling back to the colored gift tile when the
// product has no image or the image fails to load.
export default function ProductThumbnail({ src, alt, iconColor }) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <span className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-darksurface2 border border-slate-200 dark:border-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element -- Vercel Blob / uploaded URLs at arbitrary runtime paths */}
        <img src={src} alt={alt} loading="lazy" className="w-full h-full object-cover" onError={() => setFailed(true)} />
      </span>
    );
  }

  return (
    <span className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${SOFT_COLOR_CLASSES[iconColor]}`}>
      <Icon name="gift" className="w-5 h-5" />
    </span>
  );
}
