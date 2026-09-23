"use client";

import { usePathname } from "next/navigation";
import Icon from "@/components/admin-panel/Icon";
import { Can } from "@/components/providers/StaffPermissionsProvider";
import { settingsPermission } from "@/lib/permissions";

export default function PageToolbar({
  icon = "settings",
  title,
  onDiscard,
  onSave,
  saveLabel = "Save Changes",
  saving = false,
  disabled = false,
  editPermission,
}) {
  // Each settings page has its own Edit permission, named after its URL
  // (/settings/store -> settings-store.edit) unless one is passed in.
  const pathname = usePathname();
  const page = pathname?.split("/")[2];
  const requiredPermission = editPermission || settingsPermission(page, "edit");

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Icon name={icon} className="w-4 h-4" />
          <span>Settings</span>
          <span>/</span>
          <span className="font-semibold text-slate-800 dark:text-white">{title}</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-white">{title}</h1>
      </div>
      {/* Without this page's Edit permission it is view-only: no Save/Discard. */}
      <Can
        permission={requiredPermission}
        fallback={
          <span className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl bg-slate-100 dark:bg-white/5 text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0 w-fit">
            <Icon name="eye" className="w-4 h-4" />
            View only
          </span>
        }
      >
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onDiscard}
            disabled={disabled}
            className="px-4 h-9 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={disabled || saving}
            className="px-4 h-9 rounded-xl bg-primary-500 dark:bg-accent-500 hover:bg-primary-600 dark:hover:bg-accent-600 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            {saving ? "Saving…" : saveLabel}
          </button>
        </div>
      </Can>
    </div>
  );
}
