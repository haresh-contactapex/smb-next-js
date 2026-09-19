"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/admin-panel/Icon";
import { isValidEmail } from "@/components/auth/helpers";
import PasswordField from "@/components/auth/PasswordField";
import Toast from "@/components/auth/Toast";
import AdminAuthLayout from "./AdminAuthLayout";

export default function AdminLoginForm() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: "", visible: false });

  const toastTimerRef = useRef(null);

  function showToast(message) {
    setToast({ message, visible: true });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
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
      showToast("Enter a valid email and password to continue");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Unable to sign in.");
      }
      showToast("Signed in successfully");
      router.push("/");
      router.refresh();
    } catch (error) {
      showToast(error.message);
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
              className={`field-input pl-10${emailError ? " border-red-400" : ""}`}
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

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-11 rounded-xl bg-primary-500 dark:bg-accent-500 hover:bg-primary-600 dark:hover:bg-accent-600 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <Toast message={toast.message} visible={toast.visible} />
    </AdminAuthLayout>
  );
}
