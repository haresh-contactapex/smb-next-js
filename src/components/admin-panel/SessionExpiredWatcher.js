"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";

// Every admin-panel fetch call ends up going through window.fetch, so
// patching it once here is the only way to notice "the session died
// mid-page" without threading this check through every feature's
// Save/load handler individually. The staff/customer auth endpoints are
// exempt — a wrong-password 401 there is a login failure, not a timeout.
const EXEMPT_PREFIXES = ["/api/admin-auth/", "/api/auth/"];
const REDIRECT_DELAY_MS = 2500;

let patched = false;

function pathnameFrom(input) {
  const url = typeof input === "string" ? input : input instanceof Request ? input.url : "";
  try {
    return new URL(url, window.location.origin).pathname;
  } catch {
    return url;
  }
}

/**
 * Mounted once near the root of AdminLayout. Shows a full-screen "session
 * expired" overlay the moment any admin-panel API call comes back 401 —
 * i.e. Settings -> Security's Session Timeout (or Password Expiry) tripped
 * while the staff member was already sitting on a page, not just on their
 * next navigation (which middleware already redirects with its own notice).
 */
export default function SessionExpiredWatcher() {
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (patched) return;
    patched = true;
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const path = pathnameFrom(args[0]);
      const isExempt = EXEMPT_PREFIXES.some((prefix) => path.startsWith(prefix));
      if (!isExempt && path.startsWith("/api/") && response.status === 401) {
        window.dispatchEvent(new Event("staff-session-expired"));
      }
      return response;
    };
  }, []);

  useEffect(() => {
    function handleExpired() {
      setExpired(true);
    }
    window.addEventListener("staff-session-expired", handleExpired);
    return () => window.removeEventListener("staff-session-expired", handleExpired);
  }, []);

  useEffect(() => {
    if (!expired) return undefined;
    const timer = setTimeout(() => {
      window.location.href = "/admin/login?reason=timeout";
    }, REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [expired]);

  if (!expired) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-darksurface shadow-popover p-6 text-center">
        <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-error/10 text-error">
          <Icon name="alert-triangle" className="w-5 h-5" />
        </span>
        <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-1">Session Expired</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Your session has timed out. You&apos;ll be signed out and redirected to sign in.
        </p>
        <a
          href="/admin/login?reason=timeout"
          className="inline-flex h-9 items-center justify-center rounded-xl bg-primary-500 dark:bg-accent-500 px-4 text-xs font-semibold text-white hover:bg-primary-600 dark:hover:bg-accent-600 transition-colors"
        >
          Sign In Now
        </a>
      </div>
    </div>
  );
}
