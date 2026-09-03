import Icon from "@/components/admin-panel/Icon";

export default function AccountStatusSidebar({ twoFactorEnabled, onFieldChange }) {
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
          <span className="font-medium text-slate-700 dark:text-slate-200">Jan 12, 2024</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Last Login</span>
          <span className="font-medium text-slate-700 dark:text-slate-200">Today, 9:41 AM</span>
        </div>
      </div>

      <div className="border-t border-slate-100 dark:border-white/5 mt-4 pt-4">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <Icon name="shield" className="w-4 h-4 text-slate-400" /> Two-Factor Authentication
          </span>
          <input
            type="checkbox"
            className="w-4 h-4 rounded accent-primary-500 dark:accent-accent-500"
            checked={twoFactorEnabled}
            onChange={(e) => onFieldChange("twoFactorEnabled", e.target.checked)}
            aria-label="Enable two-factor authentication"
          />
        </label>
      </div>
    </section>
  );
}
