import { isPendingUpload } from "./helpers";

// What the Add Product form accepts as media and how it gets stored. No React: the form keeps the
// state, this only decides what a file is and uploads it.

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
export const ALLOWED_MODEL_EXTENSIONS = [".glb", ".usdz"];
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

// "image", "video" or "model" for a file the product page can show, otherwise null.
export function classifyMediaFile(file) {
  if (ALLOWED_IMAGE_TYPES.includes(file.type)) return "image";
  if (ALLOWED_VIDEO_TYPES.includes(file.type)) return "video";
  const lowerName = file.name.toLowerCase();
  if (ALLOWED_MODEL_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) return "model";
  return null;
}

async function uploadProductFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("purpose", "product");
  let res;
  try {
    res = await fetch("/api/media", { method: "POST", body: formData });
  } catch {
    throw new Error(`Could not reach the server while uploading ${file.name} — check your connection and try again`);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.error || `Failed to upload ${file.name}`);
  return json.data.url;
}

// Uploads every item still holding a local File and swaps its blob: preview
// URL for the stored public URL. Returns the next product state.
export async function uploadPendingFiles(product) {
  const upload = async (item) => {
    if (!isPendingUpload(item)) return item;
    const url = await uploadProductFile(item.file);
    return { type: item.type, url, name: item.name };
  };
  // One at a time: dozens of simultaneous multipart uploads can overwhelm the server
  // and surface in the browser as a bare "Failed to fetch".
  const media = [];
  for (const item of product.media) media.push(await upload(item));
  const variants = [];
  for (const v of product.variants) {
    if (!isPendingUpload(v.image)) {
      variants.push(v);
      continue;
    }
    const uploaded = await upload(v.image);
    variants.push({ ...v, image: { url: uploaded.url, name: uploaded.name } });
  }
  // Only once every upload succeeded — a partial failure keeps the local previews.
  [...product.media, ...product.variants.map((v) => v.image)]
    .filter(isPendingUpload)
    .forEach((item) => URL.revokeObjectURL(item.url));
  return { ...product, media, variants };
}
