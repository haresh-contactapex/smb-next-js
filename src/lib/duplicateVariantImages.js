import { createHash } from "node:crypto";

// Imported products often carry each color's photo twice: once as product media
// (re-hosted in our storage) and once as the variant's own image, still pointing
// at the original host. The addresses differ but the files are identical, so the
// gallery shows the same picture twice. This points such variants at the matching
// product photo so the gallery lists it once.

const hashes = new Map(); // url -> sha1 of the bytes, or null when unreadable

async function contentHash(url) {
  if (hashes.has(url)) return hashes.get(url);
  let hash = null;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (response.ok) hash = createHash("sha1").update(Buffer.from(await response.arrayBuffer())).digest("hex");
  } catch {
    // Unreachable image: leave it alone rather than guess.
  }
  hashes.set(url, hash);
  return hash;
}

const isRemote = (url) => /^https?:\/\//i.test(url);

export async function mergeDuplicateVariantImages(product) {
  const media = product.images || [];
  const stray = [...new Set((product.variants || []).map((v) => v.imageUrl).filter(Boolean))].filter(
    (url) => !media.includes(url) && isRemote(url),
  );
  if (!media.length || !stray.length) return product;

  const mediaByHash = new Map();
  for (const url of media.filter(isRemote)) {
    const hash = await contentHash(url);
    if (hash && !mediaByHash.has(hash)) mediaByHash.set(hash, url);
  }

  const remap = new Map();
  for (const url of stray) {
    const hash = await contentHash(url);
    const same = hash && mediaByHash.get(hash);
    if (same) remap.set(url, same);
  }
  if (!remap.size) return product;

  return {
    ...product,
    variants: product.variants.map((v) => (remap.has(v.imageUrl) ? { ...v, imageUrl: remap.get(v.imageUrl) } : v)),
  };
}
