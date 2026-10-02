// Redirect targets arrive in the URL (?next=...), so they are untrusted. Only an
// in-app path beginning with a single "/" is honored: never "//host", a
// backslash variant, or an absolute URL, and never the staff admin panel, which
// a customer session can't open anyway. Anything else falls back to `fallback`.
export function safeRedirectPath(next, fallback = "/account") {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  if (next === "/admin" || next.startsWith("/admin/")) return fallback;
  return next;
}
