import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { deleteMedia } from "@/lib/media";

export async function DELETE(request, { params }) {
  const auth = await requireStaffPermission("media.delete");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const url = await deleteMedia(params.id);
    if (!url) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    await del(url).catch(() => {});

    return NextResponse.json({ success: true, data: { id: params.id } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
