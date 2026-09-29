import { NextResponse } from "next/server";
import { requireNotificationViewer, notificationErrorResponse } from "@/lib/auth/notificationViewer";
import { listNotifications, clearAllNotifications } from "@/lib/notifications";

// Query: page, pageSize, q, type (entity type), status (all|read|unread), severity.
export async function GET(request) {
  const auth = await requireNotificationViewer();
  if (!auth.ok) return auth.response;

  const params = new URL(request.url).searchParams;
  try {
    const data = await listNotifications(auth.viewer, {
      page: params.get("page"),
      pageSize: params.get("pageSize"),
      q: params.get("q") || "",
      entityType: params.get("type") || "",
      status: params.get("status") || "all",
      severity: params.get("severity") || "",
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return notificationErrorResponse(error);
  }
}

// Clear all: hides every notification currently visible to the caller (only for them).
export async function DELETE() {
  const auth = await requireNotificationViewer();
  if (!auth.ok) return auth.response;

  try {
    const data = await clearAllNotifications(auth.viewer);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return notificationErrorResponse(error);
  }
}
