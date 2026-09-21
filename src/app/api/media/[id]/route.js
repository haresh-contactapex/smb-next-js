import { unlink } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { deleteMedia } from "@/lib/media";
import { getCurrentStaffUser } from "@/lib/auth/staffSession";

export async function DELETE(request, { params }) {
  const staffUser = await getCurrentStaffUser();
  if (!staffUser) {
    return NextResponse.json({ success: false, error: "Not signed in." }, { status: 401 });
  }

  try {
    const url = await deleteMedia(params.id);
    if (!url) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    if (url.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), "public", url);
      await unlink(filePath).catch(() => {});
    }

    return NextResponse.json({ success: true, data: { id: params.id } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
