"use client";

import { useCallback, useState } from "react";
import GalleryImage from "./GalleryImage";
import ImageLightbox, { imageAlt } from "./ImageLightbox";

// Two-column photo grid, in the order the admin arranged the product media.
// Any photo opens in the lightbox at that position.
export default function ProductGallery({ images, title }) {
  const [openIndex, setOpenIndex] = useState(null);
  const close = useCallback(() => setOpenIndex(null), []);

  if (images.length === 0) {
    return (
      <div className="w-full lg:w-[55%]">
        <div className="bg-[#F8F8F8] rounded-md aspect-[4/3] flex items-center justify-center text-sm text-gray-400">
          No image available
        </div>
      </div>
    );
  }

  return (
    <div className="w-full lg:w-[55%] grid grid-cols-2 gap-4 content-start">
      {images.map((src, index) => (
        <GalleryImage
          key={`${src}-${index}`}
          src={src}
          alt={imageAlt(title, index)}
          label={`View image ${index + 1} of ${images.length} larger`}
          onOpen={() => setOpenIndex(index)}
          eager={index < 2}
          className={images.length === 1 ? "col-span-2" : ""}
        />
      ))}

      {openIndex !== null && <ImageLightbox images={images} title={title} startIndex={openIndex} onClose={close} />}
    </div>
  );
}
