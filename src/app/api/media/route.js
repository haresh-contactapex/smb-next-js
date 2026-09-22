import { randomUUID } from "crypto";
import { extname } from "path";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { listMedia, createMedia } from "@/lib/media";
import { getCurrentStaffUser } from "@/lib/auth/staffSession";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

function extensionFor(file) {
  const fromName = extname(file.name || "").toLowerCase();
  if (fromName) return fromName;
  const byMime = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };
  return byMime[file.type] || "";
}

export async function GET() {
  try {
    const data = await listMedia();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const staffUser = await getCurrentStaffUser();
  if (!staffUser) {
    return NextResponse.json({ success: false, error: "Not signed in." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
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
