import { fail, ok, readJsonBody } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { logAdminActivity } from "@/lib/notifications";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { settingsPermission } from "@/lib/permissions";
import { getSocialMediaSettings, updateSocialMediaSettings } from "@/lib/socialMediaSettings";
import { DEFAULT_SOCIAL_MEDIA_SETTINGS, toSavePayload, validateSocialMediaSettingsForm } from "@/lib/shared/settingsSocialMedia";

export async function GET() {
  const auth = await requireStaffPermission(settingsPermission("social-media", "view"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    return ok((await getSocialMediaSettings()) || DEFAULT_SOCIAL_MEDIA_SETTINGS);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}

export async function PUT(request) {
  const auth = await requireStaffPermission(settingsPermission("social-media", "edit"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const body = await readJsonBody(request);
    if (body.response) return body.response;

    const settings = toSavePayload(body.payload);
    const result = validateSocialMediaSettingsForm(settings);
    if (!result.valid) return fail(result.message, 400);

    const updated = await updateSocialMediaSettings(settings);

    await logAdminActivity({
      actor: auth.user,
      action: "settings.updated",
      entityType: "settings",
      entityId: "social-media",
      title: "Settings updated: social-media",
      description: "changed the social-media settings.",
      severity: "info",
      metadata: { fields: Object.keys(settings) },
    });
    return ok(updated);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
