import { NextResponse } from "next/server";
import { clearStaffSession } from "@/lib/auth/staffSession";
import { getCurrentStaffUser } from "@/lib/auth/staffSession";
import { logAdminActivity } from "@/lib/notifications";

export async function POST() {
  const user = await getCurrentStaffUser();
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
