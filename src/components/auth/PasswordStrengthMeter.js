"use client";

import { getPasswordStrength } from "./helpers";

export default function PasswordStrengthMeter({ value }) {
  const strength = getPasswordStrength(value);
  if (!strength) return null;

  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Password strength</span>
        <span className={`text-xs font-bold ${strength.textClassName}`}>{strength.label}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${strength.barClassName}`}
          style={{ width: `${strength.percent}%` }}
        />
      </div>
    </div>
  );
}
