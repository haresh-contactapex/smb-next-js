"use client";

import Icon from "@/components/admin-panel/Icon";

export default function PasswordSection({
  currentPassword,
  newPassword,
  confirmPassword,
  passwordError,
  onFieldChange,
}) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-1.5">
        <Icon name="shield" className="w-4 h-4 text-slate-400" /> Password
      </h2>
      <p className="text-xs text-slate-400 mb-4">Leave these fields blank to keep your current password.</p>

      <div className="space-y-4">
        <div>
          <label className="field-label" htmlFor="f-current-password">
            Current Password
          </label>
          <input
            id="f-current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => onFieldChange("currentPassword", e.target.value)}
            placeholder="••••••••"
            aria-label="Current password"
            className="field-input"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label" htmlFor="f-new-password">
              New Password
            </label>
            <input
              id="f-new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => onFieldChange("newPassword", e.target.value)}
              placeholder="••••••••"
              aria-label="New password"
              className={`field-input${passwordError ? " border-red-400" : ""}`}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="f-confirm-password">
              Confirm New Password
            </label>
            <input
              id="f-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => onFieldChange("confirmPassword", e.target.value)}
              placeholder="••••••••"
              aria-label="Confirm new password"
              className={`field-input${passwordError ? " border-red-400" : ""}`}
            />
          </div>
        </div>
        {passwordError && <p className="text-xs text-error">New password and confirmation must match.</p>}
      </div>
    </section>
  );
}
