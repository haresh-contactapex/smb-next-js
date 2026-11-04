import { fail, ok } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { deleteNewsletterSubscribers, listNewsletterSubscribers } from "@/lib/newsletter";
import { readBulkIds } from "@/lib/bulkIds";
import { logAdminActivity } from "@/lib/notifications";

const MAX_BULK_DELETE = 5000;

export async function GET() {
  const auth = await requireStaffPermission("newsletter.view");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    return ok(await listNewsletterSubscribers());
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}

// Bulk delete: body `{ ids: [subscriberId, ...] }`.
export async function DELETE(request) {
  const auth = await requireStaffPermission("newsletter.delete");
  if (!auth.ok) return permissionDeniedResponse(auth);

  const { ids, error } = await readBulkIds(request, "subscriber", "delete", { max: MAX_BULK_DELETE });
  if (error) return fail(error, 400);

  try {
    const deleted = await deleteNewsletterSubscribers(ids);
    await logAdminActivity({
      actor: auth.user,
      action: "newsletter.deleted",
      entityType: "newsletter_subscriber",
      entityId: null,
      title: `${deleted} newsletter subscriber${deleted === 1 ? "" : "s"} deleted`,
      severity: "warning",
    });
    return ok({ deleted });
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
