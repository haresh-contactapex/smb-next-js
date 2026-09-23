import { NextResponse } from "next/server";
import { getCurrentStaffUser } from "@/lib/auth/staffSession";
import { getStaffPasswordHash, updateStaffPassword } from "@/lib/staff";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { getPasswordErrorMessage, isValidPassword } from "@/components/auth/helpers";

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

    const currentHash = await getStaffPasswordHash(staffUser.id);
    const matches = await verifyPassword(currentPassword, currentHash);
    if (!matches) {
      return NextResponse.json({ success: false, error: "Current password is incorrect." }, { status: 401 });
    }

    const newHash = await hashPassword(newPassword);
    await updateStaffPassword(staffUser.id, newHash);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
