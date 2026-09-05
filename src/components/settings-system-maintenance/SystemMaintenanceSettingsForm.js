"use client";

import { useRef, useState } from "react";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import TextAreaField from "@/components/settings-shared/TextAreaField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "@/components/settings-shared/Toast";

const DEFAULT_SETTINGS = {
  maintenanceModeEnabled: false,
  maintenanceMessage: "",
  debugModeEnabled: false,
};

export default function SystemMaintenanceSettingsForm() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [toast, setToast] = useState({ message: "", visible: false });
  const toastTimerRef = useRef(null);

  function showToast(message) {
    setToast({ message, visible: true });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
  }

  function setField(field, value) {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    showToast("System & Maintenance settings saved");
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and start over?")) return;
    setSettings(DEFAULT_SETTINGS);
  }

  function handleBackUpNow() {
    showToast("Backup started");
  }

  function handleClearCache() {
    showToast("Cache cleared");
  }

  return (
    <>
      <PageToolbar icon="server" title="System & Maintenance" onDiscard={handleDiscard} onSave={handleSave} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Maintenance Mode">
            <ToggleField
              label="Enable maintenance mode"
              description="Shows a maintenance page to storefront visitors while admins keep access."
              checked={settings.maintenanceModeEnabled}
              onChange={(value) => setField("maintenanceModeEnabled", value)}
            />
            <TextAreaField
              id="f-maintenance-message"
              label="Maintenance Message"
              rows={3}
              value={settings.maintenanceMessage}
              onChange={(value) => setField("maintenanceMessage", value)}
              placeholder="We'll be back soon — thanks for your patience!"
            />
            <ToggleField
              label="Enable debug mode"
              description="Shows verbose error output — disable in production."
              checked={settings.debugModeEnabled}
              onChange={(value) => setField("debugModeEnabled", value)}
            />
          </SectionCard>

          <SectionCard title="System Info">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">App Version</span>
                <span className="font-medium text-slate-700 dark:text-slate-200">1.4.2</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Environment</span>
                <span className="font-medium text-slate-700 dark:text-slate-200">Production</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Last Backup</span>
                <span className="font-medium text-slate-700 dark:text-slate-200">Aug 20, 2026 · 3:00 AM</span>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={handleBackUpNow}
                className="px-4 h-9 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                Back Up Now
              </button>
              <button
                type="button"
                onClick={handleClearCache}
                className="px-4 h-9 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                Clear Cache
              </button>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="server"
            title="About System & Maintenance"
            points={[
              "Enabling maintenance mode blocks storefront checkout — customers won't be able to complete orders while it's on.",
              "Debug mode is useful for troubleshooting but should stay off in production to avoid exposing error details.",
              "Back up your store regularly so you can recover quickly if something goes wrong.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
