import { NextResponse } from "next/server";
import { verifyJwt } from "@/lib/auth/jwt";
import { STAFF_SESSION_COOKIE, STAFF_SESSION_SCOPE } from "@/lib/auth/constants";
import { getStaffSecurityPolicy, isSessionTimedOut, isPasswordExpired } from "@/lib/auth/sessionPolicy";

// Customer-facing auth pages and the admin panel's own standalone auth pages
// (kept in sync with ConditionalShell's STANDALONE_ROUTES) — everything else
// under the admin panel requires a valid staff session.
const PUBLIC_PATHS = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/admin/login",
  "/admin/logout",
  "/admin/forgot-password",
  "/admin/reset-password",
]);

// A password-expired staff member can still reach their own Profile page
// (to change the password) and sign out; everything else bounces to Profile.
const PASSWORD_EXPIRED_ALLOWED_PATHS = new Set(["/profile"]);

// Only a same-origin, in-app path is honored for post-login redirects, so
// ?next= can't be used to bounce a staff member off-site (open redirect).
function safeNextPath(request) {
  const next = request.nextUrl.searchParams.get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(STAFF_SESSION_COOKIE)?.value;
  const payload = await verifyJwt(token);
  let isAuthenticated = Boolean(payload && payload.scope === STAFF_SESSION_SCOPE && payload.sub);
  let timedOut = false;
  let passwordExpired = false;

  // Re-checked against the *current* Settings -> Security values on every
  // navigation (not just the token's own expiry), so lowering Session
  // Timeout or Password Expiry takes effect on a session that's already
  // open. A DB hiccup fails open to the JWT's own (generous) expiry only.
  if (isAuthenticated) {
    try {
      const policy = await getStaffSecurityPolicy(payload.sub);
      if (policy) {
        if (isSessionTimedOut(payload.iat, policy.sessionTimeoutMinutes)) {
          isAuthenticated = false;
          timedOut = true;
        } else if (isPasswordExpired(policy.passwordChangedAt, policy.passwordExpiryDays)) {
          passwordExpired = true;
        }
      }
    } catch {
      // DB unreachable — leave isAuthenticated as-is.
    }
  }

  if (pathname === "/admin/login") {
    return isAuthenticated
      ? NextResponse.redirect(new URL(safeNextPath(request), request.url))
      : NextResponse.next();
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    if (timedOut) loginUrl.searchParams.set("reason", "timeout");
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(STAFF_SESSION_COOKIE);
    return response;
  }

  if (passwordExpired && !PASSWORD_EXPIRED_ALLOWED_PATHS.has(pathname)) {
    const profileUrl = new URL("/profile", request.url);
    profileUrl.searchParams.set("reason", "password-expired");
    return NextResponse.redirect(profileUrl);
  }

  return NextResponse.next();
}

// API routes are left ungated here (they're not reachable through the UI
// without first passing a gated page) — only page navigation is protected.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
