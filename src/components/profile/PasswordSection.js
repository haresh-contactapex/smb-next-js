"use client";

import Icon from "@/components/admin-panel/Icon";
import PasswordField from "@/components/auth/PasswordField";

export default function PasswordSection({
  currentPassword,
  newPassword,
  confirmPassword,
  currentPasswordError,
  newPasswordError,
  confirmPasswordError,
  onFieldChange,
  registerRef,
  onEnter,
}) {
  function handleKeyDown(e) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    onEnter?.();
  }

  function refFor(field) {
    return registerRef ? registerRef(field) : undefined;
  }

  return (
    <section
      id="password"
      className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6 scroll-mt-24"
    >
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-1.5">
        <Icon name="shield" className="w-4 h-4 text-slate-400" /> Password
      </h2>
      <p className="text-xs text-slate-400 mb-4">Leave these fields blank to keep your current password.</p>

      <div className="space-y-4">
        <PasswordField
          id="f-current-password"
          label="Current Password"
          placeholder="••••••••"
          value={currentPassword}
          onChange={(value) => onFieldChange("currentPassword", value)}
          onKeyDown={handleKeyDown}
          error={currentPasswordError}
          autoComplete="off"
          inputRef={refFor("currentPassword")}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PasswordField
            id="f-new-password"
            label="New Password"
            placeholder="••••••••"
            value={newPassword}
            onChange={(value) => onFieldChange("newPassword", value)}
            onKeyDown={handleKeyDown}
            error={newPasswordError}
            autoComplete="new-password"
            inputRef={refFor("newPassword")}
            showStrength
          />
          <PasswordField
            id="f-confirm-password"
            label="Confirm New Password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(value) => onFieldChange("confirmPassword", value)}
            onKeyDown={handleKeyDown}
            error={confirmPasswordError}
            autoComplete="new-password"
            inputRef={refFor("confirmPassword")}
          />
        </div>
      </div>
    </section>
  );
}
