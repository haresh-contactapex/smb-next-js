import { headers } from "next/headers";

// The public address of the store, for links inside emails (an email is opened far from
// the request that triggered it, so a relative link is useless). SITE_URL (or
// NEXT_PUBLIC_SITE_URL) in .env.local wins; otherwise it is read from the current
// request's host, which is right for pages, route handlers and Stripe's webhook alike.
// Returns "" when neither is available, and callers then leave links out.
export async function getSiteOrigin() {
  const configured = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");

  try {
    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
    if (!host) return "";
    const protocol = requestHeaders.get("x-forwarded-proto") || (/^(localhost|127\.|\[::1\])/.test(host) ? "http" : "https");
    return `${protocol}://${host}`;
  } catch {
    return "";
  }
}

// Whether the address is reachable from outside this machine. A product photo or a
// link to localhost would be broken in the customer's inbox.
export function isPublicOrigin(origin) {
  return /^https?:\/\//.test(origin) && !/^https?:\/\/(localhost|127\.|\[::1\]|0\.0\.0\.0)/.test(origin);
}
