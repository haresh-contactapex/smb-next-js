"use client";

import { useRef, useState } from "react";
import { DEFAULT_PROFILE, isValidEmail } from "./helpers";
import PageToolbar from "./PageToolbar";
import ProfileDetailsSection from "./ProfileDetailsSection";
import PasswordSection from "./PasswordSection";
import AccountStatusSidebar from "./AccountStatusSidebar";
import PreferencesSidebar from "./PreferencesSidebar";
import Toast from "./Toast";

export default function ProfileForm() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [toast, setToast] = useState({ message: "", visible: false });

  const toastTimerRef = useRef(null);

  function showToast(message) {
    setToast({ message, visible: true });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
  }

  function setField(field, value) {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }

  function handleAvatarPicked(file) {
    setField("avatar", { url: URL.createObjectURL(file), name: file.name });
  }

  function handleAvatarRemoved() {
    setField("avatar", null);
  }

  function handleSave() {
    if (!isValidEmail(profile.email)) {
      setEmailError(true);
      showToast("Enter a valid email address before saving");
      return;
    }
    setEmailError(false);

    if (profile.newPassword || profile.confirmPassword) {
      if (profile.newPassword !== profile.confirmPassword) {
        setPasswordError(true);
        showToast("New password and confirmation must match");
        return;
      }
    }
    setPasswordError(false);

    setProfile((prev) => ({ ...prev, currentPassword: "", newPassword: "", confirmPassword: "" }));
    showToast("Profile saved");
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and start over?")) return;
    setProfile(DEFAULT_PROFILE);
    setEmailError(false);
    setPasswordError(false);
  }

  return (
    <>
      <PageToolbar onDiscard={handleDiscard} onSave={handleSave} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <ProfileDetailsSection
            avatar={profile.avatar}
            firstName={profile.firstName}
            lastName={profile.lastName}
            email={profile.email}
            emailError={emailError}
            phone={profile.phone}
            bio={profile.bio}
            onAvatarPicked={handleAvatarPicked}
            onAvatarRemoved={handleAvatarRemoved}
            onFieldChange={setField}
          />

          <PasswordSection
            currentPassword={profile.currentPassword}
            newPassword={profile.newPassword}
            confirmPassword={profile.confirmPassword}
            passwordError={passwordError}
            onFieldChange={setField}
          />
        </div>

        <div className="space-y-6">
          <AccountStatusSidebar twoFactorEnabled={profile.twoFactorEnabled} onFieldChange={setField} />
          <PreferencesSidebar language={profile.language} timezone={profile.timezone} onFieldChange={setField} />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
