import { NextResponse } from "next/server";
import { publicErrorMessage } from "@/lib/publicError";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { deleteMedia } from "@/lib/media";
import { removeStoredFiles } from "@/lib/mediaStorage";

export async function DELETE(request, { params }) {
  const auth = await requireStaffPermission("media.delete");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const url = await deleteMedia(params.id);
    if (!url) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    await removeStoredFiles([url]);

    return NextResponse.json({ success: true, data: { id: params.id } });
  } catch (error) {
    return NextResponse.json({ success: false, error: publicErrorMessage(error) }, { status: 500 });
  }
}
