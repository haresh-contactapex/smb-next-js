import { randomUUID } from "crypto";
import { extname } from "path";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { listMedia, createMedia } from "@/lib/media";
import { getCurrentStaffUser } from "@/lib/auth/staffSession";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { settingsPermission } from "@/lib/permissions";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

// The library is also read by the product/category image pickers and the
// General settings logo/favicon fields, not just the Media page.
const READ_PERMISSIONS = [
  "media.view",
  "products.create",
  "products.edit",
  "categories.create",
  "categories.edit",
  settingsPermission("general", "edit"),
];
const UPLOAD_PERMISSIONS = ["media.create", settingsPermission("general", "edit")];

// The product editor (purpose=product) also uploads videos and 3D models.
// Only images are recorded in the Media library, which is image-only; the
// rest are stored and referenced from product_media alone.
const PRODUCT_UPLOAD_PERMISSIONS = ["products.create", "products.edit", "media.create"];
const PRODUCT_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/ogg", "video/quicktime"]);
const PRODUCT_MODEL_EXTENSIONS = new Set([".glb", ".usdz"]);
const PRODUCT_MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const PRODUCT_MAX_OTHER_SIZE_BYTES = 50 * 1024 * 1024;

function extensionFor(file) {
  const fromName = extname(file.name || "").toLowerCase();
  if (fromName) return fromName;
  const byMime = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };
  return byMime[file.type] || "";
}

// Returns "image" | "video" | "model" for an acceptable product upload, or null.
function productMediaKind(file) {
  if (ALLOWED_TYPES.has(file.type)) return "image";
  if (PRODUCT_VIDEO_TYPES.has(file.type)) return "video";
  if (PRODUCT_MODEL_EXTENSIONS.has(extname(file.name || "").toLowerCase())) return "model";
  return null;
}

function productContentType(file, kind) {
  if (file.type) return file.type;
  if (kind === "model") return file.name.toLowerCase().endsWith(".usdz") ? "model/vnd.usdz+zip" : "model/gltf-binary";
  return "application/octet-stream";
}

async function handleProductUpload(file) {
  const kind = productMediaKind(file);
  if (!kind) {
    return NextResponse.json(
      { success: false, error: "Only JPG, PNG, WEBP, or GIF images, videos, .glb, or .usdz files are allowed" },
      { status: 400 }
    );
  }
  const limit = kind === "image" ? PRODUCT_MAX_IMAGE_SIZE_BYTES : PRODUCT_MAX_OTHER_SIZE_BYTES;
  if (file.size > limit) {
    return NextResponse.json(
      { success: false, error: `${file.name} exceeds the ${limit / (1024 * 1024)}MB limit` },
      { status: 400 }
    );
  }

  const contentType = productContentType(file, kind);
  const blob = await put(`${randomUUID()}${extensionFor(file)}`, file, { access: "public", contentType });

  if (kind !== "image") {
    return NextResponse.json(
      { success: true, data: { id: null, fileName: file.name, url: blob.url, mimeType: contentType, kind } },
      { status: 201 }
    );
  }
  const created = await createMedia({
    fileName: file.name,
    url: blob.url,
    mimeType: file.type,
    sizeBytes: file.size,
  });
  return NextResponse.json({ success: true, data: { ...created, kind } }, { status: 201 });
}

export async function GET() {
  const auth = await requireStaffPermission(READ_PERMISSIONS);
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const data = await listMedia();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const purpose = formData.get("purpose");

    // Every staff member may upload their own profile avatar (purpose=avatar);
    // product editors may upload product media (purpose=product); any other
    // upload needs media or settings rights.
    if (purpose === "avatar") {
      if (!(await getCurrentStaffUser())) {
        return NextResponse.json({ success: false, error: "Not signed in." }, { status: 401 });
      }
    } else if (purpose === "product") {
      const auth = await requireStaffPermission(PRODUCT_UPLOAD_PERMISSIONS);
      if (!auth.ok) return permissionDeniedResponse(auth);
    } else {
      const auth = await requireStaffPermission(UPLOAD_PERMISSIONS);
      if (!auth.ok) return permissionDeniedResponse(auth);
    }

    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }
    if (purpose === "product") return handleProductUpload(file);
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { success: false, error: "Only JPEG, PNG, WEBP, or GIF images are allowed" },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ success: false, error: "File exceeds the 10MB limit" }, { status: 400 });
    }

    const uniqueName = `${randomUUID()}${extensionFor(file)}`;
    const blob = await put(uniqueName, file, {
      access: "public",
      contentType: file.type,
    });

    const created = await createMedia({
      fileName: file.name || uniqueName,
      url: blob.url,
      mimeType: file.type,
      sizeBytes: file.size,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
