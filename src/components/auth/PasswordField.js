"use client";

import { useState } from "react";
import Icon from "@/components/admin-panel/Icon";

export default function PasswordField({ id, label, placeholder, value, onChange, error, autoComplete }) {
  const [visible, setVisible] = useState(false);

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
          className={`field-input pl-10 pr-10${error ? " border-red-400" : ""}`}
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
      {error && <p className="text-xs text-error mt-1">{error}</p>}
    </div>
  );
}
