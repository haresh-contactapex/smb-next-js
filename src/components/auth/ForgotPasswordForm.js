"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/admin-panel/Icon";
import { isValidEmail } from "./helpers";
import AuthLayout from "./AuthLayout";
import Toast from "./Toast";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [toast, setToast] = useState({ message: "", visible: false });

  const toastTimerRef = useRef(null);

  function showToast(message) {
    setToast({ message, visible: true });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
  }

  function handleSubmit(e) {
    e.preventDefault();

    const invalid = !isValidEmail(email);
    setEmailError(invalid);
    if (invalid) {
      showToast("Enter a valid email address");
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSent(true);
      showToast("Reset link sent");
    }, 600);
  }

  if (sent) {
    return (
      <AuthLayout
        title="Check your email"
        footer={
          <Link href="/login" className="font-semibold text-primary-600 dark:text-accent-400 hover:underline">
            Back to sign in
          </Link>
        }
      >
        <div className="text-center space-y-5">
          <span className="inline-flex w-14 h-14 rounded-2xl bg-primary-500/10 dark:bg-accent-500/10 text-primary-600 dark:text-accent-400 items-center justify-center">
            <Icon name="mail" className="w-6 h-6" />
          </span>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            We sent a password reset link to <span className="font-semibold text-slate-800 dark:text-white">{email}</span>.
            Follow the instructions in that email to choose a new password.
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="text-sm font-semibold text-primary-600 dark:text-accent-400 hover:underline"
          >
            Didn&apos;t get it? Try another email
          </button>
        </div>

        <Toast message={toast.message} visible={toast.visible} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter the email linked to your account and we'll send you a reset link."
      footer={
        <Link href="/login" className="font-semibold text-primary-600 dark:text-accent-400 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label className="field-label" htmlFor="forgot-email">
            Email Address
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400">
              <Icon name="mail" className="w-4 h-4" />
            </span>
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-label="Email address"
              autoComplete="email"
              className={`field-input pl-10${emailError ? " border-red-400" : ""}`}
            />
          </div>
          {emailError && <p className="text-xs text-error mt-1">Enter a valid email address.</p>}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-11 rounded-xl bg-primary-500 dark:bg-accent-500 hover:bg-primary-600 dark:hover:bg-accent-600 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Send Reset Link"}
        </button>
      </form>

      <Toast message={toast.message} visible={toast.visible} />
    </AuthLayout>
  );
}
