import { NextResponse } from "next/server";
import { requireNotificationViewer, notificationErrorResponse } from "@/lib/auth/notificationViewer";
import { markAllNotificationsRead } from "@/lib/notifications";

export async function POST() {
  const auth = await requireNotificationViewer();
  if (!auth.ok) return auth.response;

  try {
    const data = await markAllNotificationsRead(auth.viewer);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return notificationErrorResponse(error);
  }
}
