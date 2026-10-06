// Which photos the product gallery shows for the selected variant. The first
// photo is the page's main image, so a variant with its own photo puts that
// photo there:
//   - it is already the first photo: nothing changes;
//   - it is another photo of the gallery: the two trade places, so every photo
//     stays visible and the grid doesn't reshuffle;
//   - it isn't in the gallery (the usual case: a variant photo that was never
//     added to the product media): it takes the first place. The photo it
//     replaces belongs to the default variant, so it is not shown next to a
//     different color.
// Without a variant photo the product media are shown as they are.
export function galleryImages(images, variantImage) {
  if (!variantImage) return images;
  const index = images.indexOf(variantImage);
  if (index === 0) return images;

  const next = [...images];
  if (index === -1) {
    next[0] = variantImage;
  } else {
    [next[0], next[index]] = [next[index], next[0]];
  }
  return next;
}
