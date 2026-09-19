import { NextResponse } from "next/server";
import { verifyJwt } from "@/lib/auth/jwt";
import { STAFF_SESSION_COOKIE, STAFF_SESSION_SCOPE } from "@/lib/auth/constants";

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
  const isAuthenticated = Boolean(payload && payload.scope === STAFF_SESSION_SCOPE && payload.sub);

  if (pathname === "/admin/login") {
    return isAuthenticated
      ? NextResponse.redirect(new URL(safeNextPath(request), request.url))
      : NextResponse.next();
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  if (isAuthenticated) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

// API routes are left ungated here (they're not reachable through the UI
// without first passing a gated page) — only page navigation is protected.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
