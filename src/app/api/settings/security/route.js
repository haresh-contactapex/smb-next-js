import { NextResponse } from "next/server";
import { getCurrentStaffUser } from "@/lib/auth/staffSession";
import { getSecuritySettings, updateSecuritySettings } from "@/lib/securitySettings";
import {
  isValidSessionTimeoutMinutes,
  isValidPasswordExpiryDays,
  isValidMaxLoginAttempts,
  isValidIpAllowlist,
} from "@/components/settings-security/helpers";

export async function GET() {
  const staffUser = await getCurrentStaffUser();
  if (!staffUser) {
    return NextResponse.json({ success: false, error: "Not signed in." }, { status: 401 });
  }

  try {
    const data = await getSecuritySettings();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const staffUser = await getCurrentStaffUser();
  if (!staffUser) {
    return NextResponse.json({ success: false, error: "Not signed in." }, { status: 401 });
  }

  try {
    const payload = await request.json();

    const settings = {
      requireTwoFactorAuth: Boolean(payload.requireTwoFactorAuth),
      sessionTimeoutMinutes: String(payload.sessionTimeoutMinutes || "").trim(),
      passwordExpiryDays: String(payload.passwordExpiryDays || "").trim(),
      maxLoginAttempts: String(payload.maxLoginAttempts || "").trim(),
      ipAllowlist: String(payload.ipAllowlist || "").trim(),
      enableRecaptcha: Boolean(payload.enableRecaptcha),
    };

    if (!settings.sessionTimeoutMinutes) {
      return NextResponse.json({ success: false, error: "Session timeout is required." }, { status: 400 });
    }
    if (!isValidSessionTimeoutMinutes(settings.sessionTimeoutMinutes)) {
      return NextResponse.json(
        { success: false, error: "Enter a whole number of 1 or more for the session timeout." },
        { status: 400 }
      );
    }
    if (!settings.passwordExpiryDays) {
      return NextResponse.json({ success: false, error: "Password expiry is required." }, { status: 400 });
    }
    if (!isValidPasswordExpiryDays(settings.passwordExpiryDays)) {
      return NextResponse.json(
        { success: false, error: "Enter a whole number of 1 or more for the password expiry." },
        { status: 400 }
      );
    }
    if (!settings.maxLoginAttempts) {
      return NextResponse.json({ success: false, error: "Max login attempts is required." }, { status: 400 });
    }
    if (!isValidMaxLoginAttempts(settings.maxLoginAttempts)) {
      return NextResponse.json(
        { success: false, error: "Enter a whole number of 1 or more for the max login attempts." },
        { status: 400 }
      );
    }
    if (settings.ipAllowlist && !isValidIpAllowlist(settings.ipAllowlist)) {
      return NextResponse.json(
        { success: false, error: "Enter one valid IP address or CIDR range per line." },
        { status: 400 }
      );
    }

    const updated = await updateSecuritySettings(settings);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
