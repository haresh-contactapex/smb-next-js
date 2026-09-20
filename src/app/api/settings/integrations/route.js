import { NextResponse } from "next/server";
import { getCurrentStaffUser } from "@/lib/auth/staffSession";
import { getIntegrationsSettings, updateIntegrationsSettings } from "@/lib/integrationsSettings";
import {
  isValidGoogleAnalyticsId,
  isValidMetaPixelId,
  isValidMailchimpApiKey,
  isValidGoogleRecaptchaSiteKey,
  isValidGoogleRecaptchaSecretKey,
} from "@/components/settings-integrations/helpers";

export async function GET() {
  const staffUser = await getCurrentStaffUser();
  if (!staffUser) {
    return NextResponse.json({ success: false, error: "Not signed in." }, { status: 401 });
  }

  try {
    const data = await getIntegrationsSettings();
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
      return NextResponse.json(
        { success: false, error: "Enter your Measurement ID to enable Google Analytics." },
        { status: 400 }
      );
    }
    if (settings.googleAnalyticsId && !isValidGoogleAnalyticsId(settings.googleAnalyticsId)) {
      return NextResponse.json(
        { success: false, error: "Enter a valid Measurement ID, e.g. G-XXXXXXXXXX." },
        { status: 400 }
      );
    }

    if (settings.metaPixelEnabled && !settings.metaPixelId) {
      return NextResponse.json(
        { success: false, error: "Enter your Pixel ID to enable Meta / Facebook Pixel." },
        { status: 400 }
      );
    }
    if (settings.metaPixelId && !isValidMetaPixelId(settings.metaPixelId)) {
      return NextResponse.json({ success: false, error: "Enter a valid numeric Pixel ID." }, { status: 400 });
    }

    if (settings.mailchimpEnabled && !settings.mailchimpApiKey) {
      return NextResponse.json(
        { success: false, error: "Enter your API key to enable Mailchimp." },
        { status: 400 }
      );
    }
    if (settings.mailchimpApiKey && !isValidMailchimpApiKey(settings.mailchimpApiKey)) {
      return NextResponse.json(
        { success: false, error: "Enter a valid Mailchimp API key, e.g. {32 hex chars}-us21." },
        { status: 400 }
      );
    }

    if (settings.googleRecaptchaEnabled && !settings.googleRecaptchaSiteKey) {
      return NextResponse.json(
        { success: false, error: "Enter your Site Key to enable Google reCAPTCHA." },
        { status: 400 }
      );
    }
    if (settings.googleRecaptchaSiteKey && !isValidGoogleRecaptchaSiteKey(settings.googleRecaptchaSiteKey)) {
      return NextResponse.json(
        { success: false, error: "Enter a valid reCAPTCHA site key." },
        { status: 400 }
      );
    }

    if (settings.googleRecaptchaEnabled && !settings.googleRecaptchaSecretKey) {
      return NextResponse.json(
        { success: false, error: "Enter your Secret Key to enable Google reCAPTCHA." },
        { status: 400 }
      );
    }
    if (settings.googleRecaptchaSecretKey && !isValidGoogleRecaptchaSecretKey(settings.googleRecaptchaSecretKey)) {
      return NextResponse.json(
        { success: false, error: "Enter a valid reCAPTCHA secret key." },
        { status: 400 }
      );
    }

    const updated = await updateIntegrationsSettings(settings);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
