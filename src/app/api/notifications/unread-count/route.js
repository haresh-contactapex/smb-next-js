import { ok } from "@/lib/api";
import { requireNotificationViewer, notificationErrorResponse } from "@/lib/auth/notificationViewer";
import { getUnreadCount } from "@/lib/notifications";

export async function GET() {
  const auth = await requireNotificationViewer();
  if (!auth.ok) return auth.response;

  try {
    const unreadCount = await getUnreadCount(auth.viewer);
    return ok({ unreadCount });
  } catch (error) {
    return notificationErrorResponse(error);
  }
}
