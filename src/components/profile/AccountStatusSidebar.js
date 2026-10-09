import ToggleField from "@/components/settings-shared/ToggleField";

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AccountStatusSidebar({ twoFactorEnabled, createdAt, lastLoginAt, onFieldChange }) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Account Status</h2>

      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Role</span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-600 dark:bg-accent-500/10 dark:text-accent-400">
            Store Admin
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Member Since</span>
          <span className="font-medium text-slate-700 dark:text-slate-200">{formatDateTime(createdAt)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Last Login</span>
          <span className="font-medium text-slate-700 dark:text-slate-200">{formatDateTime(lastLoginAt)}</span>
        </div>
      </div>

      <div className="border-t border-slate-100 dark:border-white/5 mt-4 pt-4">
        <ToggleField
          icon="shield"
          label="Two-Factor Authentication"
          description="Require a verification code emailed at sign-in, in addition to your password."
          checked={twoFactorEnabled}
          onChange={(value) => onFieldChange("twoFactorEnabled", value)}
        />
      </div>
    </section>
  );
}
