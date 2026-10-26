import { extname } from "path";
import { fail, ok } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { listMedia, createMedia, deleteMediaItems } from "@/lib/media";
import { saveUpload, removeStoredFiles } from "@/lib/mediaStorage";
import { readBulkIds } from "@/lib/bulkIds";
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
  "content.create",
  "content.edit",
  "blog.create",
  "blog.edit",
];
const UPLOAD_PERMISSIONS = ["media.create", settingsPermission("general", "edit")];

// The CMS page editor and the Blog post editor (purpose=cms) insert images from the
// library, upload new ones (recorded in the library like any image) and upload PDFs to
// link to, such as a printable ring sizer. Those PDFs are stored and referenced from
// the page alone. The Media page itself (no purpose) also takes PDFs and does record
// them in the library.
const CMS_UPLOAD_PERMISSIONS = ["content.create", "content.edit", "blog.create", "blog.edit"];
const CMS_MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

// The product editor (purpose=product) also uploads videos and 3D models.
// Only images are recorded in the Media library from there; the rest are
// stored and referenced from product_media alone.
const PRODUCT_UPLOAD_PERMISSIONS = ["products.create", "products.edit", "media.create"];

// The category editor (purpose=category) uploads a single image, handled like
// any library image.
const CATEGORY_UPLOAD_PERMISSIONS = ["categories.create", "categories.edit", "media.create"];
const PRODUCT_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/ogg", "video/quicktime"]);
const PRODUCT_MODEL_EXTENSIONS = new Set([".glb", ".usdz"]);
const PRODUCT_MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const PRODUCT_MAX_OTHER_SIZE_BYTES = 50 * 1024 * 1024;

// Files are stored on this server's disk and served by their extension, so the extension
// is never taken from the visitor's file name unless it is one we serve.
const STORED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".ogg", ".mov", ".glb", ".usdz"]);
const EXTENSION_BY_MIME = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/ogg": ".ogg",
  "video/quicktime": ".mov",
};

function extensionFor(file) {
  const fromName = extname(file.name || "").toLowerCase();
  if (STORED_EXTENSIONS.has(fromName)) return fromName;
  return EXTENSION_BY_MIME[file.type] || "";
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

// Some browsers/OSes report an empty type for a .pdf, so the extension counts too;
// pdfProblem() then checks the real content.
function isPdfFile(file) {
  return file.type === "application/pdf" || (!file.type && (file.name || "").toLowerCase().endsWith(".pdf"));
}

// Returns an error response for an unacceptable PDF, or null when it's fine.
async function pdfProblem(file) {
  if (file.size > CMS_MAX_PDF_SIZE_BYTES) {
    return fail("The PDF exceeds the 10MB limit", 400);
  }
  // A PDF starts with "%PDF-"; the browser-reported type alone is not trusted.
  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (String.fromCharCode(...header) !== "%PDF-") {
    return fail("That file is not a valid PDF", 400);
  }
  return null;
}

async function handleCmsPdfUpload(file) {
  const problem = await pdfProblem(file);
  if (problem) return problem;
  const { url } = await saveUpload(file, ".pdf");
  return ok({ id: null, fileName: file.name, url, mimeType: "application/pdf", kind: "pdf" }, 201);
}

// A PDF uploaded on the Media page is recorded in the library like an image.
async function handleLibraryPdfUpload(file) {
  const problem = await pdfProblem(file);
  if (problem) return problem;
  const { url } = await saveUpload(file, ".pdf");
  const created = await createMedia({
    fileName: file.name || "document.pdf",
    url,
    mimeType: "application/pdf",
    sizeBytes: file.size,
  });
  return ok(created, 201);
}

async function handleProductUpload(file) {
  const kind = productMediaKind(file);
  if (!kind) {
    return fail("Only JPG, PNG, WEBP, or GIF images, videos, .glb, or .usdz files are allowed", 400);
  }
  const limit = kind === "image" ? PRODUCT_MAX_IMAGE_SIZE_BYTES : PRODUCT_MAX_OTHER_SIZE_BYTES;
  if (file.size > limit) {
    return fail(`${file.name} exceeds the ${limit / (1024 * 1024)}MB limit`, 400);
  }

  const contentType = productContentType(file, kind);
  const extension = extensionFor(file);
  if (!extension) {
    return fail("That file type could not be identified", 400);
  }
  const { url } = await saveUpload(file, extension);

  if (kind !== "image") {
    return ok({ id: null, fileName: file.name, url, mimeType: contentType, kind }, 201);
  }
  const created = await createMedia({
    fileName: file.name,
    url,
    mimeType: file.type,
    sizeBytes: file.size,
  });
  return ok({ ...created, kind }, 201);
}

export async function GET() {
  const auth = await requireStaffPermission(READ_PERMISSIONS);
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const data = await listMedia();
    return ok(data);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const purpose = formData.get("purpose");

    // Every staff member may upload their own profile avatar (purpose=avatar);
    // product editors may upload product media (purpose=product), category
    // editors a category image (purpose=category); any other
    // upload needs media or settings rights.
    if (purpose === "avatar") {
      if (!(await getCurrentStaffUser())) {
        return fail("Not signed in.", 401);
      }
    } else if (purpose === "product") {
      const auth = await requireStaffPermission(PRODUCT_UPLOAD_PERMISSIONS);
      if (!auth.ok) return permissionDeniedResponse(auth);
    } else if (purpose === "category") {
      const auth = await requireStaffPermission(CATEGORY_UPLOAD_PERMISSIONS);
      if (!auth.ok) return permissionDeniedResponse(auth);
    } else if (purpose === "cms") {
      const auth = await requireStaffPermission(CMS_UPLOAD_PERMISSIONS);
      if (!auth.ok) return permissionDeniedResponse(auth);
    } else {
      const auth = await requireStaffPermission(UPLOAD_PERMISSIONS);
      if (!auth.ok) return permissionDeniedResponse(auth);
    }

    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return fail("No file provided", 400);
    }
    if (purpose === "product") return handleProductUpload(file);
    if (purpose === "cms" && file.type === "application/pdf") return handleCmsPdfUpload(file);
    // Only the Media page (no purpose) stores PDFs in the library; the other
    // purposes (avatar, category, settings logo/favicon) are image-only.
    if (!purpose && isPdfFile(file)) return handleLibraryPdfUpload(file);
    if (!ALLOWED_TYPES.has(file.type)) {
      return fail(purpose
            ? "Only JPEG, PNG, WEBP, or GIF images are allowed"
            : "Only JPEG, PNG, WEBP, or GIF images, or PDF files, are allowed", 400);
    }
    if (file.size > MAX_SIZE_BYTES) {
      return fail("File exceeds the 10MB limit", 400);
    }

    const { url } = await saveUpload(file, extensionFor(file));

    const created = await createMedia({
      fileName: file.name || url.split("/").pop(),
      url,
      mimeType: file.type,
      sizeBytes: file.size,
    });

    return ok(created, 201);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}

// Bulk delete: body `{ ids: [mediaId, ...] }`. Like the single delete, the
// stored files are removed best-effort after their rows are gone.
export async function DELETE(request) {
  const auth = await requireStaffPermission("media.delete");
  if (!auth.ok) return permissionDeniedResponse(auth);

  const { ids, error } = await readBulkIds(request, "file");
  if (error) return fail(error, 400);

  try {
    const urls = await deleteMediaItems(ids);
    if (urls.length > 0) await removeStoredFiles(urls);
    return ok({ deleted: urls.length });
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
