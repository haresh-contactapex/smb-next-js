// Platforms in the order the storefront footer shows them. `field` is the form/API key,
// `icon` the SVG the footer masks in white.
export const SOCIAL_PLATFORMS = [
  { field: "facebookUrl", label: "Facebook", icon: "/storefront/contact/icons/facebook.svg" },
  { field: "twitterUrl", label: "X", icon: "/storefront/contact/icons/x.svg" },
  { field: "instagramUrl", label: "Instagram", icon: "/storefront/contact/icons/instagram.svg" },
  { field: "pinterestUrl", label: "Pinterest", icon: "/storefront/contact/icons/pinterest.svg" },
  { field: "tiktokUrl", label: "TikTok", icon: "/storefront/contact/icons/tiktok.svg" },
  { field: "youtubeUrl", label: "YouTube", icon: "/storefront/contact/icons/youtube.svg" },
];

export const SOCIAL_URL_MAX_LENGTH = 255;

export const DEFAULT_SOCIAL_MEDIA_SETTINGS = {
  facebookUrl: "",
  instagramUrl: "",
  twitterUrl: "",
  pinterestUrl: "",
  tiktokUrl: "",
  youtubeUrl: "",
  showShareButtons: true,
  showFooterLinks: true,
};

export function toFormSettings(data) {
  if (!data) return DEFAULT_SOCIAL_MEDIA_SETTINGS;
  const settings = { ...DEFAULT_SOCIAL_MEDIA_SETTINGS };
  for (const { field } of SOCIAL_PLATFORMS) settings[field] = data[field] || "";
  settings.showShareButtons = Boolean(data.showShareButtons);
  settings.showFooterLinks = Boolean(data.showFooterLinks);
  return settings;
}

export function toSavePayload(settings) {
  const payload = { showShareButtons: Boolean(settings.showShareButtons), showFooterLinks: Boolean(settings.showFooterLinks) };
  for (const { field } of SOCIAL_PLATFORMS) payload[field] = String(settings[field] || "").trim();
  return payload;
}

function isWebUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

// Returns { valid, errors: { [field]: message }, firstErrorField, message }. A blank URL is fine
// (that platform is simply not shown); anything else must be an http(s) address.
export function validateSocialMediaSettingsForm(settings) {
  const errors = {};
  for (const { field, label } of SOCIAL_PLATFORMS) {
    const value = String(settings[field] || "").trim();
    if (!value) continue;
    if (value.length > SOCIAL_URL_MAX_LENGTH) errors[field] = `${label} URL must be ${SOCIAL_URL_MAX_LENGTH} characters or fewer.`;
    else if (!isWebUrl(value)) errors[field] = `Enter a full ${label} address starting with https://`;
  }
  const firstErrorField = SOCIAL_PLATFORMS.map((platform) => platform.field).find((field) => errors[field]);
  return { valid: !firstErrorField, errors, firstErrorField, message: firstErrorField ? errors[firstErrorField] : "" };
}
