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

function extensionFor(file) {
  const fromName = extname(file.name || "").toLowerCase();
  if (fromName) return fromName;
  const byMime = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };
  return byMime[file.type] || "";
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

    // Every staff member may upload their own profile avatar (purpose=avatar);
    // any other upload needs media or settings rights.
    if (formData.get("purpose") === "avatar") {
      if (!(await getCurrentStaffUser())) {
        return NextResponse.json({ success: false, error: "Not signed in." }, { status: 401 });
      }
    } else {
      const auth = await requireStaffPermission(UPLOAD_PERMISSIONS);
      if (!auth.ok) return permissionDeniedResponse(auth);
    }

    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }
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
