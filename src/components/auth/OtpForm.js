"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/admin-panel/Icon";
import Toast from "@/components/auth/Toast";

// Keep in sync with OTP_RESEND_COOLDOWN_MS in src/lib/auth/loginOtp.js — the
// client starts its own cooldown optimistically so Resend doesn't just
// round-trip into a 429; a 429 still re-arms it from the server's own value.
const RESEND_COOLDOWN_SECONDS = 30;

function formatSeconds(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// The sign-in 2FA step, shared by staff and customer sign-in: enter the
// emailed code, with a countdown to its expiry and a rate-limited "Resend
// code". Fully self-contained — the login form only needs to know when it
// succeeds or is abandoned.
//   apiBase  which verify-otp / resend-otp / cancel-otp routes to call:
//            "/api/admin-auth" (staff) or "/api/auth" (customers).
//   idPrefix keeps the input id unique per sign-in page.
export default function OtpForm({ apiBase, idPrefix, maskedEmail, expiresInSeconds, onVerified, onCancel }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(expiresInSeconds);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });
  const toastTimerRef = useRef(null);
  const inputRef = useRef(null);

  function showToast(message, variant = "success") {
    setToast({ message, visible: true, variant });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 5000);
  }

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // One ticking clock drives both countdowns; each stops at zero on its own.
  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
      setResendCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const expired = secondsLeft <= 0;

  function handleCodeChange(value) {
    setCode(value.replace(/\D/g, "").slice(0, 6));
    if (error) setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting || expired) return;
    if (code.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Incorrect code.");
      }
      onVerified(result.data);
    } catch (err) {
      setError(err.message);
      setCode("");
      inputRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (resending || resendCooldown > 0) return;
    setResending(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/resend-otp`, { method: "POST" });
      const result = await res.json();
      if (!res.ok || !result.success) {
        if (result.retryAfterSeconds) setResendCooldown(result.retryAfterSeconds);
        throw new Error(result.error || "Couldn't send a new code.");
      }
      setCode("");
      setSecondsLeft(result.data.expiresInSeconds);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      showToast("A new code was sent.");
      inputRef.current?.focus();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setResending(false);
    }
  }

  async function handleCancel() {
    try {
      await fetch(`${apiBase}/cancel-otp`, { method: "POST" });
    } finally {
      onCancel();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl bg-primary-50 dark:bg-accent-500/10 border border-primary-100 dark:border-accent-500/20 p-3.5">
        <span className="shrink-0 w-8 h-8 rounded-lg bg-white dark:bg-darksurface grid place-items-center text-primary-600 dark:text-accent-400">
          <Icon name="mail" className="w-4 h-4" />
        </span>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          We sent a 6-digit code to <span className="font-semibold text-slate-800 dark:text-white">{maskedEmail}</span>.
          Enter it below to finish signing in.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label className="field-label" htmlFor={`${idPrefix}-otp-code`}>
            Verification Code
          </label>
          <input
            id={`${idPrefix}-otp-code`}
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="000000"
            aria-label="6-digit verification code"
            disabled={submitting}
            className={`field-input text-center text-lg tracking-[0.4em] font-semibold${
              error
                ? " !border-red-400 focus:!border-red-400 !bg-red-50 focus:!bg-red-50 dark:!bg-red-500/10 dark:focus:!bg-red-500/10"
                : ""
            }`}
          />
          {error ? (
            <p className="text-xs text-error mt-1">{error}</p>
          ) : (
            <p className="text-xs text-slate-400 mt-1">
              {expired ? "This code has expired." : `Expires in ${formatSeconds(secondsLeft)}`}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting || expired || code.length !== 6}
          className="w-full h-11 rounded-xl bg-primary-500 dark:bg-accent-500 hover:bg-primary-600 dark:hover:bg-accent-600 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-60"
        >
          {submitting ? "Verifying…" : "Verify & Sign In"}
        </button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={handleCancel}
            className="font-semibold text-slate-500 dark:text-slate-400 hover:underline"
          >
            Use a different account
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || resendCooldown > 0}
            className="font-semibold text-primary-600 dark:text-accent-400 hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
          >
            {resending ? "Sending…" : resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend code"}
          </button>
        </div>
      </form>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={() => setToast((t) => ({ ...t, visible: false }))} />
    </div>
  );
}
