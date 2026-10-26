import { fail, ok, readJsonBody } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { logAdminActivity } from "@/lib/notifications";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { settingsPermission } from "@/lib/permissions";
import { getSecuritySettings, updateSecuritySettings } from "@/lib/securitySettings";
import {
  isValidSessionTimeoutMinutes,
  isValidPasswordExpiryDays,
  isValidMaxLoginAttempts,
  isValidIpAllowlist,
} from "@/lib/shared/settingsSecurity";

export async function GET() {
  const auth = await requireStaffPermission(settingsPermission("security", "view"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const data = await getSecuritySettings();
    return ok(data);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}

export async function PUT(request) {
  const auth = await requireStaffPermission(settingsPermission("security", "edit"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const body = await readJsonBody(request);
    if (body.response) return body.response;
    const payload = body.payload;

    const settings = {
      requireTwoFactorAuth: Boolean(payload.requireTwoFactorAuth),
      requireCustomerTwoFactor: Boolean(payload.requireCustomerTwoFactor),
      sessionTimeoutMinutes: String(payload.sessionTimeoutMinutes || "").trim(),
      passwordExpiryDays: String(payload.passwordExpiryDays || "").trim(),
      maxLoginAttempts: String(payload.maxLoginAttempts || "").trim(),
      ipAllowlist: String(payload.ipAllowlist || "").trim(),
      enableRecaptcha: Boolean(payload.enableRecaptcha),
    };

    if (!settings.sessionTimeoutMinutes) {
      return fail("Session timeout is required.", 400);
    }
    if (!isValidSessionTimeoutMinutes(settings.sessionTimeoutMinutes)) {
      return fail("Enter a whole number of 1 or more for the session timeout.", 400);
    }
    if (!settings.passwordExpiryDays) {
      return fail("Password expiry is required.", 400);
    }
    if (!isValidPasswordExpiryDays(settings.passwordExpiryDays)) {
      return fail("Enter a whole number of 1 or more for the password expiry.", 400);
    }
    if (!settings.maxLoginAttempts) {
      return fail("Max login attempts is required.", 400);
    }
    if (!isValidMaxLoginAttempts(settings.maxLoginAttempts)) {
      return fail("Enter a whole number of 1 or more for the max login attempts.", 400);
    }
    if (settings.ipAllowlist && !isValidIpAllowlist(settings.ipAllowlist)) {
      return fail("Enter one valid IP address or CIDR range per line.", 400);
    }

    const updated = await updateSecuritySettings(settings);

    await logAdminActivity({

      actor: auth.user,

      action: "settings.updated",

      entityType: "settings",

      entityId: "security",

      title: "Settings updated: security",

      description: `  changed the security settings.`,

      severity: "warning",

      metadata: { fields: Object.keys(settings) },

    });
    return ok(updated);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
