import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

// Uploaded media lives on this server's disk, in public/uploads/YYYY/MM/ (the same
// year/month layout WordPress uses). The folder is served by src/app/uploads/[...path].
export const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");
const URL_PREFIX = "/uploads/";

function yearMonthFolder(now = new Date()) {
  return [String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0")];
}

// Saves an uploaded File as public/uploads/YYYY/MM/<uuid><extension> and returns its public URL.
// The caller picks `extension` from an allowlist; the original file name is kept in the database only.
export async function saveUpload(file, extension) {
  const [year, month] = yearMonthFolder();
  const directory = path.join(UPLOAD_ROOT, year, month);
  await mkdir(directory, { recursive: true });
  const name = `${randomUUID()}${extension}`;
  await writeFile(path.join(directory, name), Buffer.from(await file.arrayBuffer()));
  return { url: `${URL_PREFIX}${year}/${month}/${name}` };
}

// Resolves a path below public/uploads to a file path, or null when it would leave that folder.
export function resolveUploadPath(segments) {
  if (!segments.length) return null;
  for (const segment of segments) {
    if (!segment || segment.startsWith(".") || /[\\/\0]/.test(segment)) return null;
  }
  const file = path.resolve(UPLOAD_ROOT, ...segments);
  return file.startsWith(UPLOAD_ROOT + path.sep) ? file : null;
}

// Deletes the stored files behind the given media URLs, best effort. Only /uploads/ URLs are
// ours to delete; links to other hosts (for example images uploaded to Vercel Blob before the
// move to this server) are left alone.
export async function removeStoredFiles(urls) {
  await Promise.all(
    urls.map(async (url) => {
      if (typeof url !== "string" || !url.startsWith(URL_PREFIX)) return;
      let segments;
      try {
        segments = decodeURIComponent(url.split("?")[0].slice(URL_PREFIX.length)).split("/");
      } catch {
        return;
      }
      const file = resolveUploadPath(segments);
      if (file) await unlink(file).catch(() => {});
    })
  );
}
