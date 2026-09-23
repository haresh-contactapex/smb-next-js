"use client";

import { useEffect, useRef, useState } from "react";
import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";

const ENV_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

let scriptLoadPromise = null;

function loadRecaptchaScript() {
  if (window.grecaptcha?.render) return Promise.resolve(window.grecaptcha);
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    window.__onRecaptchaLoad = () => resolve(window.grecaptcha);
    const script = document.createElement("script");
    script.src = "https://www.google.com/recaptcha/api.js?onload=__onRecaptchaLoad&render=explicit";
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Failed to load reCAPTCHA"));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

/**
 * Google reCAPTCHA v2 checkbox widget. Only mount this where
 * Settings -> Security's "Enable reCAPTCHA on login and checkout" is on
 * (see useGeneralSettings().enableRecaptcha) — callers own that condition
 * and are responsible for including the token from `onChange` in their
 * submit payload as `recaptchaToken`.
 */
export default function Recaptcha({ onChange }) {
  const { googleRecaptchaEnabled, googleRecaptchaSiteKey } = useGeneralSettings();
  // Settings -> Integrations' "Google reCAPTCHA" site key wins when the
  // admin has entered one there; otherwise fall back to .env.local so a
  // deployment with no database row still renders the widget.
  const siteKey = (googleRecaptchaEnabled && googleRecaptchaSiteKey) || ENV_SITE_KEY;
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!siteKey) {
      console.error("Recaptcha: no reCAPTCHA site key configured (Settings -> Integrations or NEXT_PUBLIC_RECAPTCHA_SITE_KEY).");
      setFailed(true);
      return undefined;
    }

    const isDark = document.documentElement.classList.contains("dark");

    loadRecaptchaScript()
      .then((grecaptcha) => {
        if (cancelled || !grecaptcha || !containerRef.current || widgetIdRef.current !== null) return;
        widgetIdRef.current = grecaptcha.render(containerRef.current, {
          sitekey: siteKey,
          theme: isDark ? "dark" : "light",
          callback: (token) => onChange(token),
          "expired-callback": () => onChange(""),
          "error-callback": () => onChange(""),
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  if (failed) {
    return <p className="text-xs text-error">reCAPTCHA failed to load. Please refresh the page and try again.</p>;
  }

  return <div ref={containerRef} />;
}
