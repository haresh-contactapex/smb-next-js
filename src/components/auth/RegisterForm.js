"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/admin-panel/Icon";
import { DEFAULT_REGISTER, isValidEmail, isValidPassword } from "./helpers";
import PasswordField from "./PasswordField";
import AuthLayout from "./AuthLayout";
import Toast from "./Toast";

export default function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState(DEFAULT_REGISTER);
  const [errors, setErrors] = useState({});
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

  function handleSubmit(e) {
    e.preventDefault();

    const nextErrors = {
      firstName: form.firstName.trim().length === 0,
      email: !isValidEmail(form.email),
      password: !isValidPassword(form.password),
      confirmPassword: form.confirmPassword !== form.password,
      agreeTerms: !form.agreeTerms,
    };
    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      showToast("Please fix the highlighted fields");
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      showToast("Account created — welcome!");
      router.push("/");
    }, 600);
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join Shop My Band for faster checkout and order tracking."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary-600 dark:text-accent-400 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label" htmlFor="reg-first-name">
              First Name
            </label>
            <input
              id="reg-first-name"
              type="text"
              value={form.firstName}
              onChange={(e) => setField("firstName", e.target.value)}
              placeholder="Jane"
              aria-label="First name"
              autoComplete="given-name"
              className={`field-input${errors.firstName ? " border-red-400" : ""}`}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="reg-last-name">
              Last Name
            </label>
            <input
              id="reg-last-name"
              type="text"
              value={form.lastName}
              onChange={(e) => setField("lastName", e.target.value)}
              placeholder="Doe"
              aria-label="Last name"
              autoComplete="family-name"
              className="field-input"
            />
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="reg-email">
            Email Address
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400">
              <Icon name="mail" className="w-4 h-4" />
            </span>
            <input
              id="reg-email"
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="you@example.com"
              aria-label="Email address"
              autoComplete="email"
              className={`field-input pl-10${errors.email ? " border-red-400" : ""}`}
            />
          </div>
          {errors.email && <p className="text-xs text-error mt-1">Enter a valid email address.</p>}
        </div>

        <PasswordField
          id="reg-password"
          label="Password"
          placeholder="At least 8 characters"
          value={form.password}
          onChange={(v) => setField("password", v)}
          error={errors.password ? "Password must be at least 8 characters." : null}
          autoComplete="new-password"
        />

        <PasswordField
          id="reg-confirm-password"
          label="Confirm Password"
          placeholder="Re-enter your password"
          value={form.confirmPassword}
          onChange={(v) => setField("confirmPassword", v)}
          error={errors.confirmPassword ? "Passwords do not match." : null}
          autoComplete="new-password"
        />

        <div>
          <label className="toggle-row text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={form.agreeTerms}
              onChange={(e) => setField("agreeTerms", e.target.checked)}
            />
            I agree to the{" "}
            <Link href="#" className="font-semibold text-primary-600 dark:text-accent-400 hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="#" className="font-semibold text-primary-600 dark:text-accent-400 hover:underline">
              Privacy Policy
            </Link>
          </label>
          {errors.agreeTerms && <p className="text-xs text-error mt-1">You must accept the terms to continue.</p>}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-11 rounded-xl bg-primary-500 dark:bg-accent-500 hover:bg-primary-600 dark:hover:bg-accent-600 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-60"
        >
          {submitting ? "Creating account…" : "Create Account"}
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

      <Toast message={toast.message} visible={toast.visible} />
    </AuthLayout>
  );
}
