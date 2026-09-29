import { NextResponse } from "next/server";
import { getCurrentStaffUser } from "./staffSession";
import { getNotificationViewer, NotificationError } from "../notifications";

/**
 * Session gate for /api/notifications/*. The viewer (id, role, permissions)
 * is always derived from the staff session cookie + database — never from the
 * request. Returns { ok: true, user, viewer } or { ok: false, response }.
 */
export async function requireNotificationViewer() {
  const user = await getCurrentStaffUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ success: false, error: "Not signed in." }, { status: 401 }) };
  }
  const viewer = await getNotificationViewer(user);
  return { ok: true, user, viewer };
}

export function notificationErrorResponse(error) {
  if (error instanceof NotificationError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }
  // 42P01 = undefined_table: migration not applied yet.
  if (error?.code === "42P01") {
    return NextResponse.json(
      { success: false, error: "Notifications aren't set up yet. Run npm run db:migrate:admin-notifications." },
      { status: 503 }
    );
  }
  console.error("Notifications API error", error);
  return NextResponse.json({ success: false, error: "Something went wrong. Try again." }, { status: 500 });
}
