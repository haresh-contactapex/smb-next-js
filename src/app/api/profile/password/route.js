import { NextResponse } from "next/server";
import { publicErrorMessage } from "@/lib/publicError";
import { createStaffSession, getCurrentStaffUser } from "@/lib/auth/staffSession";
import { updateStaffPassword } from "@/lib/staff";
import { hashPassword } from "@/lib/auth/password";
import { checkStaffCurrentPassword } from "@/lib/auth/staffReauth";
import { getPasswordErrorMessage, isValidPassword } from "@/lib/shared/auth";

export async function PUT(request) {
  const staffUser = await getCurrentStaffUser();
  if (!staffUser) {
    return NextResponse.json({ success: false, error: "Not signed in." }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword, confirmPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ success: false, error: "Fill in all password fields." }, { status: 400 });
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: "New password and confirmation must match." },
        { status: 400 }
      );
    }
    if (!isValidPassword(newPassword)) {
      return NextResponse.json(
        { success: false, error: getPasswordErrorMessage(newPassword) || "Enter a new password." },
        { status: 400 }
      );
    }

    const rejection = await checkStaffCurrentPassword(staffUser.id, currentPassword);
    if (rejection) {
      return NextResponse.json({ success: false, error: rejection.error, field: rejection.field }, { status: rejection.status });
    }

    const newHash = await hashPassword(newPassword);
    await updateStaffPassword(staffUser.id, newHash);
    // The change signs out every session issued before it (including this one), so give this
    // device a fresh one; any other device has to sign in again with the new password.
    await createStaffSession(staffUser.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: publicErrorMessage(error) }, { status: 500 });
  }
}
