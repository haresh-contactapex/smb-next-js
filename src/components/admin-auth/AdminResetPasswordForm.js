"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { isValidPassword } from "@/components/auth/helpers";
import PasswordField from "@/components/auth/PasswordField";
import Toast from "@/components/auth/Toast";
import AdminAuthLayout from "./AdminAuthLayout";

export default function AdminResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState({ message: "", visible: false });

  const toastTimerRef = useRef(null);

  function showToast(message) {
    setToast({ message, visible: true });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const nextErrors = {
      password: !isValidPassword(password),
      confirmPassword: confirmPassword !== password,
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      showToast("Please fix the highlighted fields");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin-auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Unable to reset your password.");
      }
      setDone(true);
      showToast("Password updated");
    } catch (error) {
      showToast(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AdminAuthLayout
        title="Invalid reset link"
        subtitle="This password reset link is missing or malformed."
        footer={
          <Link
            href="/admin/forgot-password"
            className="font-semibold text-primary-600 dark:text-accent-400 hover:underline"
          >
            Request a new link
          </Link>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300 text-center">
          Double check the link from your email, or request a new one.
        </p>
      </AdminAuthLayout>
    );
  }

  if (done) {
    return (
      <AdminAuthLayout
        title="Password updated"
        subtitle="You can now sign in with your new password."
        footer={
          <Link href="/admin/login" className="font-semibold text-primary-600 dark:text-accent-400 hover:underline">
            Back to sign in
          </Link>
        }
      >
        <button
          type="button"
          onClick={() => router.push("/admin/login")}
          className="w-full h-11 rounded-xl bg-primary-500 dark:bg-accent-500 hover:bg-primary-600 dark:hover:bg-accent-600 text-white text-sm font-semibold shadow-sm transition-colors"
        >
          Sign In
        </button>

        <Toast message={toast.message} visible={toast.visible} />
      </AdminAuthLayout>
    );
  }

  return (
    <AdminAuthLayout
      title="Choose a new password"
      subtitle="Enter a new password for your staff account."
      footer={
        <Link href="/admin/login" className="font-semibold text-primary-600 dark:text-accent-400 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <PasswordField
          id="admin-reset-password"
          label="New Password"
          placeholder="At least 8 characters"
          value={password}
          onChange={setPassword}
          error={errors.password ? "Password must be at least 8 characters." : null}
          autoComplete="new-password"
        />

        <PasswordField
          id="admin-reset-confirm-password"
          label="Confirm New Password"
          placeholder="Re-enter your new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          error={errors.confirmPassword ? "Passwords do not match." : null}
          autoComplete="new-password"
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-11 rounded-xl bg-primary-500 dark:bg-accent-500 hover:bg-primary-600 dark:hover:bg-accent-600 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-60"
        >
          {submitting ? "Updating…" : "Update Password"}
        </button>
      </form>

      <Toast message={toast.message} visible={toast.visible} />
    </AdminAuthLayout>
  );
}
