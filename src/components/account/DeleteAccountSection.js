"use client";

import { useRef, useState } from "react";
import CheckoutField from "../storefront/checkout/CheckoutField";
import { requestJson } from "../storefront/cart/cartApi";
import PasswordInput from "./PasswordInput";
import SettingsCard from "./SettingsCard";
import { BTN_DANGER, BTN_DANGER_SOLID, BTN_OUTLINE } from "./accountStyles";
import { DELETE_CONFIRM_WORD } from "./profileHelpers";

// Permanently deletes the account. Hidden behind a button, then guarded by the
// password and a typed confirmation, because it can't be undone.
export default function DeleteAccountSection({ notify }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);
  const formRef = useRef(null);
  const triggerRef = useRef(null);

  const confirmed = confirmText.trim().toUpperCase() === DELETE_CONFIRM_WORD;

  function close() {
    setOpen(false);
    setPassword("");
    setConfirmText("");
    setError("");
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (deletingRef.current || !confirmed) return;
    if (!password) {
      setError("Enter your password to confirm.");
      formRef.current?.querySelector("#delete-password")?.focus();
      return;
    }

    deletingRef.current = true;
    setDeleting(true);
    const result = await requestJson("DELETE", "/api/account", { currentPassword: password });
    if (!result.ok) {
      deletingRef.current = false;
      setDeleting(false);
      setError(result.error);
      notify(result.error, "error");
      return;
    }
    // The session is gone: a full navigation also resets the cart and wishlist providers.
    window.location.assign("/");
  }

  return (
    <SettingsCard
      id="delete"
      tone="danger"
      title="Delete account"
      description="Permanently deletes your account, saved addresses, cards and wishlist. Your past orders are kept by the store for its records, but are no longer linked to you."
    >
      {!open ? (
        <button ref={triggerRef} type="button" onClick={() => setOpen(true)} className={BTN_DANGER}>
          Delete my account…
        </button>
      ) : (
        <form ref={formRef} onSubmit={handleSubmit} noValidate className="max-w-md">
          <p role="alert" className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-[13.5px] text-red-700">
            This can&apos;t be undone. If you have an order that isn&apos;t finished yet, you&apos;ll need to wait until it is completed or cancelled.
          </p>
          <div className="grid gap-5">
            <PasswordInput
              id="delete-password"
              label="Your password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              error={error}
              autoComplete="current-password"
            />
            <CheckoutField
              id="delete-confirm"
              label={`Type ${DELETE_CONFIRM_WORD} to confirm`}
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              autoComplete="off"
              placeholder={DELETE_CONFIRM_WORD}
            />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="submit" disabled={deleting || !confirmed} className={BTN_DANGER_SOLID}>
              {deleting ? "Deleting…" : "Permanently delete my account"}
            </button>
            <button type="button" onClick={close} disabled={deleting} className={BTN_OUTLINE}>
              Keep my account
            </button>
          </div>
        </form>
      )}
    </SettingsCard>
  );
}
