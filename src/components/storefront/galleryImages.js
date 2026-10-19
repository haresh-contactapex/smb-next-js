import { variantsInOptionOrder } from "./wishlist/wishlistHelpers";

// Every distinct photo the variants carry, in the product's option order (so a
// product with colors lists them first color first). Variants without a photo
// are skipped.
export function orderedVariantImages(product) {
  return [...new Set(variantsInOptionOrder(product).map((variant) => variant.imageUrl).filter(Boolean))];
}

// The photos the gallery offers: the product media, in the order the admin set,
// without repeats. Variant photos are often other copies of the same pictures
// (for example the originals from an import), so appending them showed the same
// shot twice; they only fill the gallery when the product has no media of its own.
// A selected variant's photo is still shown as the main image either way.
export function galleryPhotos(mediaImages, variantImages) {
  const media = [...new Set(mediaImages)];
  return media.length ? media : [...new Set(variantImages)];
}
