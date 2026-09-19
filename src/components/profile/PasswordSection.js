"use client";

import Icon from "@/components/admin-panel/Icon";

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

  // `!`-prefixed (important) because .field-input's own border/background
  // rules tie in specificity with plain Tailwind utilities and win on source
  // order, so a plain "border-red-400 bg-red-50" is silently no-op'd.
  function fieldClass(hasError) {
    const errorClass = hasError
      ? " !border-red-400 focus:!border-red-400 !bg-red-50 focus:!bg-red-50 dark:!bg-red-500/10 dark:focus:!bg-red-500/10"
      : "";
    return `field-input${errorClass}`;
  }

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
            ref={refFor("currentPassword")}
            type="password"
            autoComplete="off"
            value={currentPassword}
            onChange={(e) => onFieldChange("currentPassword", e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="••••••••"
            aria-label="Current password"
            className={fieldClass(currentPasswordError)}
          />
          {currentPasswordError && <p className="text-xs text-error mt-1">{currentPasswordError}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label" htmlFor="f-new-password">
              New Password
            </label>
            <input
              id="f-new-password"
              ref={refFor("newPassword")}
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => onFieldChange("newPassword", e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              aria-label="New password"
              className={fieldClass(newPasswordError)}
            />
            {newPasswordError && <p className="text-xs text-error mt-1">{newPasswordError}</p>}
          </div>
          <div>
            <label className="field-label" htmlFor="f-confirm-password">
              Confirm New Password
            </label>
            <input
              id="f-confirm-password"
              ref={refFor("confirmPassword")}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => onFieldChange("confirmPassword", e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              aria-label="Confirm new password"
              className={fieldClass(confirmPasswordError)}
            />
            {confirmPasswordError && <p className="text-xs text-error mt-1">{confirmPasswordError}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
