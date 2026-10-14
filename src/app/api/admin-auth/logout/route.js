import { NextResponse } from "next/server";
import { clearStaffSession } from "@/lib/auth/staffSession";
import { getCurrentStaffUser } from "@/lib/auth/staffSession";
import { revokeStaffSessions } from "@/lib/auth/sessionRevocation";
import { logAdminActivity } from "@/lib/notifications";

export async function POST() {
  const user = await getCurrentStaffUser();
  // Invalidates the token itself, not just this browser's cookie, so a copy of it stops working.
  if (user) await revokeStaffSessions(user.id).catch((error) => console.error("admin logout: could not revoke", error));
  await clearStaffSession();
  if (user) {
    await logAdminActivity({
      actor: user,
      action: "auth.logout",
      entityType: "auth",
      entityId: user.id,
      title: "Admin signed out",
      description: `${user.firstName} ${user.lastName} signed out.`,
    });
  }
  return NextResponse.json({ success: true });
}
