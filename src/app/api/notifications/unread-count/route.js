import { NextResponse } from "next/server";
import { requireNotificationViewer, notificationErrorResponse } from "@/lib/auth/notificationViewer";
import { getUnreadCount } from "@/lib/notifications";

export async function GET() {
  const auth = await requireNotificationViewer();
  if (!auth.ok) return auth.response;

  try {
    const unreadCount = await getUnreadCount(auth.viewer);
    return NextResponse.json({ success: true, data: { unreadCount } });
  } catch (error) {
    return notificationErrorResponse(error);
  }
}
