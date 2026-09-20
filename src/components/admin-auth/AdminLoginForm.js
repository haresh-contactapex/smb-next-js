"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/admin-panel/Icon";
import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";
import { isValidEmail } from "@/components/auth/helpers";
import PasswordField from "@/components/auth/PasswordField";
import Toast from "@/components/auth/Toast";
import Recaptcha from "@/components/auth/Recaptcha";
import AdminAuthLayout from "./AdminAuthLayout";

export default function AdminLoginForm() {
  const { enableRecaptcha } = useGeneralSettings();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
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
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
  }

  function dismissToast() {
    clearTimeout(toastTimerRef.current);
    setToast((t) => ({ ...t, visible: false }));
  }

  // Reads the redirect reason from the URL directly (rather than
  // next/navigation's useSearchParams) so this page never needs a Suspense
  // boundary just to show a one-off notice.
  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("reason");
    if (reason === "timeout") {
      showToast("Your session timed out and you were signed out.", "error");
      window.history.replaceState(null, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const res = await fetch("/api/admin-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password, recaptchaToken }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Unable to sign in.");
      }
      showToast("Signed in successfully");
      router.push("/");
      router.refresh();
    } catch (error) {
      showToast(error.message, "error");
      setRecaptchaToken("");
      setRecaptchaKey((k) => k + 1);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminAuthLayout title="Admin Sign In" subtitle="Sign in to manage the store.">
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label className="field-label" htmlFor="admin-login-email">
            Email Address
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400">
              <Icon name="mail" className="w-4 h-4" />
            </span>
            <input
              id="admin-login-email"
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="you@shopmyband.com"
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
          id="admin-login-password"
          label="Password"
          placeholder="Enter your password"
          value={form.password}
          onChange={(v) => setField("password", v)}
          error={passwordError ? "Enter your password." : null}
          autoComplete="current-password"
        />

        <div className="flex justify-end">
          <Link
            href="/admin/forgot-password"
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
      </form>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </AdminAuthLayout>
  );
}
