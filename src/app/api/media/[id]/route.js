import { fail, ok } from "@/lib/api";
import { isUuid } from "@/lib/shared/ids";
import { publicErrorMessage } from "@/lib/publicError";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { deleteMedia } from "@/lib/media";
import { removeStoredFiles } from "@/lib/mediaStorage";

export async function DELETE(request, { params }) {
  const auth = await requireStaffPermission("media.delete");
  if (!auth.ok) return permissionDeniedResponse(auth);
  if (!isUuid(params.id)) return fail("Not found", 404);

  try {
    const url = await deleteMedia(params.id);
    if (!url) {
      return fail("Not found", 404);
    }

    await removeStoredFiles([url]);

    return ok({ id: params.id });
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
