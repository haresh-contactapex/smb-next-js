import { variantsInOptionOrder } from "./wishlist/wishlistHelpers";

// Every distinct photo the variants carry, in the product's option order (so a
// product with colors lists them first color first). Variants without a photo
// are skipped.
export function orderedVariantImages(product) {
  return [...new Set(variantsInOptionOrder(product).map((variant) => variant.imageUrl).filter(Boolean))];
}

// The photos the gallery offers: the product media first, then each variant
// photo that isn't already among them (variant photos are usually never added to
// the product media), without repeats.
export function galleryPhotos(mediaImages, variantImages) {
  return [...new Set([...mediaImages, ...variantImages])];
}
