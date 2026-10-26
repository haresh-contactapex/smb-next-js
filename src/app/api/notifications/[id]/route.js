import { fail, ok } from "@/lib/api";
import { requireNotificationViewer, notificationErrorResponse } from "@/lib/auth/notificationViewer";
import { setNotificationRead, clearNotification } from "@/lib/notifications";

// { read: true | false }
export async function PATCH(request, { params }) {
  const auth = await requireNotificationViewer();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    if (!body || typeof body.read !== "boolean") {
      return fail("Send { read: true | false }.", 400);
    }
    const data = await setNotificationRead(auth.viewer, id, body.read);
    return ok(data);
  } catch (error) {
    return notificationErrorResponse(error);
  }
}

export async function DELETE(request, { params }) {
  const auth = await requireNotificationViewer();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const data = await clearNotification(auth.viewer, id);
    return ok(data);
  } catch (error) {
    return notificationErrorResponse(error);
  }
}
