import { sql } from "./db";
import { SOCIAL_PLATFORMS } from "./shared/settingsSocialMedia";

function toPublicSettings(row) {
  return {
    facebookUrl: row.facebook_url || "",
    instagramUrl: row.instagram_url || "",
    twitterUrl: row.twitter_url || "",
    pinterestUrl: row.pinterest_url || "",
    tiktokUrl: row.tiktok_url || "",
    youtubeUrl: row.youtube_url || "",
    showShareButtons: row.show_share_buttons,
    showFooterLinks: row.show_footer_links,
  };
}

export async function getSocialMediaSettings() {
  const [row] = await sql`SELECT * FROM social_media_settings WHERE id = 1`;
  return row ? toPublicSettings(row) : null;
}

export async function updateSocialMediaSettings(settings) {
  const [row] = await sql`
    INSERT INTO social_media_settings (
      id, facebook_url, instagram_url, twitter_url, pinterest_url, tiktok_url, youtube_url,
      show_share_buttons, show_footer_links
    ) VALUES (
      1, ${settings.facebookUrl || null}, ${settings.instagramUrl || null}, ${settings.twitterUrl || null},
      ${settings.pinterestUrl || null}, ${settings.tiktokUrl || null}, ${settings.youtubeUrl || null},
      ${settings.showShareButtons}, ${settings.showFooterLinks}
    )
    ON CONFLICT (id) DO UPDATE SET
      facebook_url = EXCLUDED.facebook_url,
      instagram_url = EXCLUDED.instagram_url,
      twitter_url = EXCLUDED.twitter_url,
      pinterest_url = EXCLUDED.pinterest_url,
      tiktok_url = EXCLUDED.tiktok_url,
      youtube_url = EXCLUDED.youtube_url,
      show_share_buttons = EXCLUDED.show_share_buttons,
      show_footer_links = EXCLUDED.show_footer_links,
      updated_at = now()
    RETURNING *
  `;
  return toPublicSettings(row);
}

// The icons the storefront footer shows: [{ label, href, icon }] for every platform with a URL,
// or [] when the footer links are switched off. Returns null when the settings can't be read
// (table not migrated yet, database down) so the caller can keep its built-in links.
export async function getFooterSocialLinks() {
  let settings;
  try {
    settings = await getSocialMediaSettings();
  } catch (error) {
    console.error("Social media settings failed to load", error);
    return null;
  }
  if (!settings) return null;
  if (!settings.showFooterLinks) return [];
  return SOCIAL_PLATFORMS.filter((platform) => settings[platform.field]).map((platform) => ({
    label: platform.label,
    href: settings[platform.field],
    icon: platform.icon,
  }));
}
