import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { extname } from "path";
import { Readable } from "stream";
import { resolveUploadPath } from "@/lib/mediaStorage";

// `next start` only serves files that were in public/ when the server started, so files
// uploaded afterwards are streamed from disk here. Public by design (store images), like
// the rest of public/. Only the extensions the upload API can produce are served.
export const dynamic = "force-dynamic";

const CONTENT_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "video/ogg",
  ".mov": "video/quicktime",
  ".glb": "model/gltf-binary",
  ".usdz": "model/vnd.usdz+zip",
};

const notFound = () => new Response("Not found", { status: 404 });

export async function GET(request, { params }) {
  const { path: segments } = await params;
  const file = resolveUploadPath(segments || []);
  if (!file) return notFound();

  const contentType = CONTENT_TYPES[extname(file).toLowerCase()];
  const info = contentType ? await stat(file).catch(() => null) : null;
  if (!info?.isFile()) return notFound();

  let start = 0;
  let end = info.size - 1;
  let status = 200;
  const headers = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
  };

  const range = request.headers.get("range");
  const match = range ? /^bytes=(\d*)-(\d*)$/.exec(range) : null;
  if (match && (match[1] || match[2])) {
    if (match[1] === "") {
      start = Math.max(info.size - Number(match[2]), 0);
    } else {
      start = Number(match[1]);
      if (match[2]) end = Math.min(Number(match[2]), end);
    }
    if (start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
    }
    status = 206;
    headers["Content-Range"] = `bytes ${start}-${end}/${info.size}`;
  }

  headers["Content-Length"] = String(info.size === 0 ? 0 : end - start + 1);
  const body = info.size === 0 ? null : Readable.toWeb(createReadStream(file, { start, end }));
  return new Response(body, { status, headers });
}
