import { fail, ok } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { exportNewsletterSubscribersToCsv } from "@/lib/newsletter";

export async function GET() {
  const auth = await requireStaffPermission("newsletter.export");
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const csv = await exportNewsletterSubscribersToCsv();
    const filename = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    return ok({ csv, filename });
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
