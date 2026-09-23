"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/admin-panel/Icon";
import { EMPTY_PROFILE, toFormState, validateProfileForm } from "./helpers";
import PageToolbar from "./PageToolbar";
import ProfileDetailsSection from "./ProfileDetailsSection";
import PasswordSection from "./PasswordSection";
import AccountStatusSidebar from "./AccountStatusSidebar";
import PreferencesSidebar from "./PreferencesSidebar";
import Toast from "@/components/add-product/Toast";

// Keep in sync with AUTO_DISMISS_MS in the shared Add Product toast, which
// also drives the progress-bar animation for both success and error messages.
const TOAST_AUTO_DISMISS_MS = 10000;

export default function ProfileForm() {
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });
  const [passwordExpiredNotice, setPasswordExpiredNotice] = useState(false);

  const toastTimerRef = useRef(null);
  const fieldRefs = useRef({});

  // Reads the redirect reason from the URL directly (rather than
  // next/navigation's useSearchParams) so this page never needs a Suspense
  // boundary just to show a one-off notice.
  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("reason");
    if (reason === "password-expired") {
      setPasswordExpiredNotice(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  function registerRef(field) {
    return (el) => {
      fieldRefs.current[field] = el;
    };
  }

  function showToast(message, variant = "success") {
    setToast({ message, visible: true, variant });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(
      () => setToast((t) => ({ ...t, visible: false })),
      TOAST_AUTO_DISMISS_MS,
    );
  }

  function dismissToast() {
    clearTimeout(toastTimerRef.current);
    setToast((t) => ({ ...t, visible: false }));
  }

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await fetch("/api/profile");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load profile");
      setProfile(toFormState(json.data));
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setField(field, value) {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  async function handleAvatarPicked(file) {
    const formData = new FormData();
    formData.append("file", file);
    // Lets any staff member upload their own avatar without media rights.
    formData.append("purpose", "avatar");
    try {
      const res = await fetch("/api/media", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to upload photo");
      setField("avatarUrl", json.data.url);
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  function handleAvatarRemoved() {
    setField("avatarUrl", null);
  }

  async function handleSave() {
    const result = validateProfileForm(profile);
    setErrors(result.errors);

    if (!result.valid) {
      showToast(result.message, "error");
      fieldRefs.current[result.firstErrorField]?.focus();
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          phone: profile.phone,
          bio: profile.bio,
          avatarUrl: profile.avatarUrl,
          language: profile.language,
          timezone: profile.timezone,
          twoFactorEnabled: profile.twoFactorEnabled,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save profile");

      if (profile.newPassword) {
        const passwordRes = await fetch("/api/profile/password", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentPassword: profile.currentPassword,
            newPassword: profile.newPassword,
            confirmPassword: profile.confirmPassword,
          }),
        });
        const passwordJson = await passwordRes.json();
        if (!passwordRes.ok || !passwordJson.success) {
          throw new Error(passwordJson.error || "Failed to update password");
        }
      }

      setProfile(toFormState(json.data));
      if (profile.newPassword) setPasswordExpiredNotice(false);
      showToast("Profile saved");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and reload your saved profile?")) return;
    setErrors({});
    loadProfile();
  }

  return (
    <>
      {passwordExpiredNotice && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning"
        >
          <Icon name="alert-triangle" className="w-4 h-4 mt-0.5 shrink-0" />
          <p>
            <span className="font-bold">Your password has expired.</span> Set a new one below to continue using the
            admin panel.
          </p>
        </div>
      )}

      <PageToolbar onDiscard={handleDiscard} onSave={handleSave} saving={saving} disabled={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <ProfileDetailsSection
            avatarUrl={profile.avatarUrl}
            firstName={profile.firstName}
            lastName={profile.lastName}
            email={profile.email}
            emailError={errors.email}
            phone={profile.phone}
            phoneError={errors.phone}
            firstNameError={errors.firstName}
            lastNameError={errors.lastName}
            bio={profile.bio}
            onAvatarPicked={handleAvatarPicked}
            onAvatarRemoved={handleAvatarRemoved}
            onFieldChange={setField}
            registerRef={registerRef}
            onEnter={handleSave}
          />

          <PasswordSection
            currentPassword={profile.currentPassword}
            newPassword={profile.newPassword}
            confirmPassword={profile.confirmPassword}
            currentPasswordError={errors.currentPassword}
            newPasswordError={errors.newPassword}
            confirmPasswordError={errors.confirmPassword}
            onFieldChange={setField}
            registerRef={registerRef}
            onEnter={handleSave}
          />
        </div>

        <div className="space-y-6">
          <AccountStatusSidebar
            twoFactorEnabled={profile.twoFactorEnabled}
            createdAt={profile.createdAt}
            lastLoginAt={profile.lastLoginAt}
            onFieldChange={setField}
          />
          <PreferencesSidebar language={profile.language} timezone={profile.timezone} onFieldChange={setField} />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </>
  );
}
