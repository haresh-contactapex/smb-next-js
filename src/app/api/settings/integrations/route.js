import { fail, ok, readJsonBody } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { logAdminActivity } from "@/lib/notifications";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { settingsPermission } from "@/lib/permissions";
import { getIntegrationsSettings, updateIntegrationsSettings } from "@/lib/integrationsSettings";
import {
  isValidGoogleAnalyticsId,
  isValidMetaPixelId,
  isValidMailchimpApiKey,
  isValidGoogleRecaptchaSiteKey,
  isValidGoogleRecaptchaSecretKey,
} from "@/lib/shared/settingsIntegrations";

export async function GET() {
  const auth = await requireStaffPermission(settingsPermission("integrations", "view"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const data = await getIntegrationsSettings();
    return ok(data);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}

export async function PUT(request) {
  const auth = await requireStaffPermission(settingsPermission("integrations", "edit"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const body = await readJsonBody(request);
    if (body.response) return body.response;
    const payload = body.payload;

    const settings = {
      googleAnalyticsEnabled: Boolean(payload.googleAnalyticsEnabled),
      googleAnalyticsId: String(payload.googleAnalyticsId || "").trim(),
      metaPixelEnabled: Boolean(payload.metaPixelEnabled),
      metaPixelId: String(payload.metaPixelId || "").trim(),
      mailchimpEnabled: Boolean(payload.mailchimpEnabled),
      mailchimpApiKey: String(payload.mailchimpApiKey || "").trim(),
      googleRecaptchaEnabled: Boolean(payload.googleRecaptchaEnabled),
      googleRecaptchaSiteKey: String(payload.googleRecaptchaSiteKey || "").trim(),
      googleRecaptchaSecretKey: String(payload.googleRecaptchaSecretKey || "").trim(),
    };

    if (settings.googleAnalyticsEnabled && !settings.googleAnalyticsId) {
      return fail("Enter your Measurement ID to enable Google Analytics.", 400);
    }
    if (settings.googleAnalyticsId && !isValidGoogleAnalyticsId(settings.googleAnalyticsId)) {
      return fail("Enter a valid Measurement ID, e.g. G-XXXXXXXXXX.", 400);
    }

    if (settings.metaPixelEnabled && !settings.metaPixelId) {
      return fail("Enter your Pixel ID to enable Meta / Facebook Pixel.", 400);
    }
    if (settings.metaPixelId && !isValidMetaPixelId(settings.metaPixelId)) {
      return fail("Enter a valid numeric Pixel ID.", 400);
    }

    if (settings.mailchimpEnabled && !settings.mailchimpApiKey) {
      return fail("Enter your API key to enable Mailchimp.", 400);
    }
    if (settings.mailchimpApiKey && !isValidMailchimpApiKey(settings.mailchimpApiKey)) {
      return fail("Enter a valid Mailchimp API key, e.g. {32 hex chars}-us21.", 400);
    }

    if (settings.googleRecaptchaEnabled && !settings.googleRecaptchaSiteKey) {
      return fail("Enter your Site Key to enable Google reCAPTCHA.", 400);
    }
    if (settings.googleRecaptchaSiteKey && !isValidGoogleRecaptchaSiteKey(settings.googleRecaptchaSiteKey)) {
      return fail("Enter a valid reCAPTCHA site key.", 400);
    }

    if (settings.googleRecaptchaEnabled && !settings.googleRecaptchaSecretKey) {
      return fail("Enter your Secret Key to enable Google reCAPTCHA.", 400);
    }
    if (settings.googleRecaptchaSecretKey && !isValidGoogleRecaptchaSecretKey(settings.googleRecaptchaSecretKey)) {
      return fail("Enter a valid reCAPTCHA secret key.", 400);
    }

    const updated = await updateIntegrationsSettings(settings);

    await logAdminActivity({

      actor: auth.user,

      action: "settings.updated",

      entityType: "settings",

      entityId: "integrations",

      title: "Settings updated: integrations",

      description: `  changed the integrations settings.`,

      severity: "warning",

      metadata: { fields: Object.keys(settings) },

    });
    return ok(updated);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
