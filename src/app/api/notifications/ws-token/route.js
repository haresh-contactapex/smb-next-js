import { NextResponse } from "next/server";
import { requireNotificationViewer } from "@/lib/auth/notificationViewer";
import { signJwt } from "@/lib/auth/jwt";
import { NOTIFICATIONS_WS_SCOPE } from "@/lib/auth/constants";

// Hands the browser a 60-second ticket for the WebSocket handshake (the
// session cookie is httpOnly and may not reach the WS host). The WS server
// still loads the role from the database itself; the ticket only names the user.
export async function GET() {
  const auth = await requireNotificationViewer();
  if (!auth.ok) return auth.response;

  const url = process.env.NOTIFICATIONS_WS_URL;
  if (!url) return NextResponse.json({ success: true, data: { enabled: false } });

  const ticket = await signJwt({ sub: auth.user.id, scope: NOTIFICATIONS_WS_SCOPE }, "60s");
  return NextResponse.json({ success: true, data: { enabled: true, url, ticket } });
}
