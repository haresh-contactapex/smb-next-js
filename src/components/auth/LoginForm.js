"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/admin-panel/Icon";
import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";
import { mergeGuestWishlist } from "@/components/storefront/wishlist/wishlistApi";
import { DEFAULT_LOGIN, isValidEmail } from "./helpers";
import PasswordField from "./PasswordField";
import AuthLayout from "./AuthLayout";
import Toast from "./Toast";
import Recaptcha from "./Recaptcha";

// `next` is where to go after signing in: the page the visitor was trying to
// reach (already checked by the login page) or their account.
export default function LoginForm({ next = "/account" }) {
  const router = useRouter();
  const { enableRecaptcha } = useGeneralSettings();
  const [form, setForm] = useState(DEFAULT_LOGIN);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const [recaptchaKey, setRecaptchaKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });

  const toastTimerRef = useRef(null);

  function showToast(message, variant = "success") {
    setToast({ message, visible: true, variant });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 5000);
  }

  function dismissToast() {
    clearTimeout(toastTimerRef.current);
    setToast((t) => ({ ...t, visible: false }));
  }

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const emailInvalid = !isValidEmail(form.email);
    const passwordInvalid = form.password.length === 0;
    setEmailError(emailInvalid);
    setPasswordError(passwordInvalid);
    if (emailInvalid || passwordInvalid) {
      showToast("Enter a valid email and password to continue", "error");
      return;
    }
    if (enableRecaptcha && !recaptchaToken) {
      showToast("Please complete the reCAPTCHA verification.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          rememberMe: form.rememberMe,
          recaptchaToken,
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Unable to sign in.");
      }
      // Items saved as a guest move into the account's wishlist now that there is one.
      await mergeGuestWishlist();
      showToast("Signed in successfully");
      router.replace(next);
      router.refresh(); // server components re-read the session cookie
    } catch (error) {
      showToast(error.message, "error");
      // The token is single-use, and a failed submit likely means it's
      // already been spent (or expired) — force a fresh widget/token.
      setRecaptchaToken("");
      setRecaptchaKey((k) => k + 1);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage your orders, wishlist and account details."
      footer={
        <>
          New to Shop My Band?{" "}
          <Link href={next === "/account" ? "/register" : `/register?next=${encodeURIComponent(next)}`} className="font-semibold text-primary-600 dark:text-accent-400 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label className="field-label" htmlFor="login-email">
            Email Address
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400">
              <Icon name="mail" className="w-4 h-4" />
            </span>
            <input
              id="login-email"
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="you@example.com"
              aria-label="Email address"
              autoComplete="email"
              className={`field-input pl-10${
                emailError
                  ? " !border-red-400 focus:!border-red-400 !bg-red-50 focus:!bg-red-50 dark:!bg-red-500/10 dark:focus:!bg-red-500/10"
                  : ""
              }`}
            />
          </div>
          {emailError && <p className="text-xs text-error mt-1">Enter a valid email address.</p>}
        </div>

        <PasswordField
          id="login-password"
          label="Password"
          placeholder="Enter your password"
          value={form.password}
          onChange={(v) => setField("password", v)}
          error={passwordError ? "Enter your password." : null}
          autoComplete="current-password"
        />

        <div className="flex items-center justify-between">
          <label className="toggle-row text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={form.rememberMe}
              onChange={(e) => setField("rememberMe", e.target.checked)}
            />
            Remember me
          </label>
          <Link
            href="/forgot-password"
            className="text-sm font-semibold text-primary-600 dark:text-accent-400 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {enableRecaptcha && <Recaptcha key={recaptchaKey} onChange={setRecaptchaToken} />}

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-11 rounded-xl bg-primary-500 dark:bg-accent-500 hover:bg-primary-600 dark:hover:bg-accent-600 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign In"}
        </button>

        <div className="flex items-center gap-3 pt-1">
          <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          <span className="text-xs font-medium text-slate-400">OR</span>
          <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
        </div>

        <button
          type="button"
          className="w-full h-11 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-center gap-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
        >
          <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-white/10 grid place-items-center text-[10px] font-bold text-slate-500 dark:text-slate-300">
            G
          </span>
          Continue with Google
        </button>
      </form>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </AuthLayout>
  );
}
