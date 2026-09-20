"use client";

import { useState } from "react";
import Icon from "@/components/admin-panel/Icon";
import { getPasswordErrorMessage } from "./helpers";
import PasswordStrengthMeter from "./PasswordStrengthMeter";

// showStrength opts a field into live requirement checking + a strength
// meter as the user types, for a "new password" field (Register, Reset).
// Leave it off for a "current password" field (Login) or a Confirm field,
// where strength/requirements aren't meaningful.
export default function PasswordField({
  id,
  label,
  placeholder,
  value,
  onChange,
  error,
  autoComplete,
  showStrength = false,
}) {
  const [visible, setVisible] = useState(false);

  const liveMessage = showStrength && value ? getPasswordErrorMessage(value) : null;
  const displayError = error || liveMessage;

  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400">
          <Icon name="lock" className="w-4 h-4" />
        </span>
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          autoComplete={autoComplete}
          className={`field-input pl-10 pr-10${
            displayError
              ? " !border-red-400 focus:!border-red-400 !bg-red-50 focus:!bg-red-50 dark:!bg-red-500/10 dark:focus:!bg-red-500/10"
              : ""
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <Icon name={visible ? "eye-off" : "eye"} className="w-full h-full" />
        </button>
      </div>
      {showStrength && <PasswordStrengthMeter value={value} />}
      {displayError && <p className="text-xs text-error mt-1">{displayError}</p>}
    </div>
  );
}
