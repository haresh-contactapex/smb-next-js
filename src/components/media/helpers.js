// Alt text for a library item: its saved description, else a readable form of
// the file name ("gold-band_01.jpg" -> "gold band 01").
export function altTextFor(item) {
  return item.altText || item.fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
}

// Uploads one image to the Media library right away and returns the stored
// item ({ id, url, fileName, ... }). Used by editors that have no save-time
// upload step. Rejects with a readable message.
export async function uploadLibraryImage(file, purpose) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only JPEG, PNG, WEBP, or GIF images can be used.");
  }
  const formData = new FormData();
  formData.append("file", file);
  formData.append("purpose", purpose);
  const res = await fetch("/api/media", { method: "POST", body: formData });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.error || "The image couldn't be uploaded.");
  return json.data;
}
