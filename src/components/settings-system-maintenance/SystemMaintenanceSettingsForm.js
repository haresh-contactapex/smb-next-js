"use client";

import { useEffect, useRef, useState } from "react";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import TextAreaField from "@/components/settings-shared/TextAreaField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "./Toast";
import {
  DEFAULT_SYSTEM_MAINTENANCE_SETTINGS,
  LAST_BACKUP_STORAGE_KEY,
  backupFileName,
  backupPercent,
  formatBytes,
  readBackupStream,
  toFormSettings,
  toSavePayload,
  validateSystemMaintenanceSettingsForm,
} from "./helpers";

export default function SystemMaintenanceSettingsForm() {
  const [settings, setSettings] = useState(DEFAULT_SYSTEM_MAINTENANCE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });

  const [backup, setBackup] = useState({ running: false, percent: 0, done: 0, total: 0, table: "" });
  const [lastBackup, setLastBackup] = useState(null);
  const [savedFile, setSavedFile] = useState(null);

  const backupAbortRef = useRef(null);
  const toastTimerRef = useRef(null);
  const maintenanceMessageInputRef = useRef(null);

  const fieldRefs = {
    maintenanceMessage: maintenanceMessageInputRef,
  };

  function focusField(field) {
    fieldRefs[field]?.current?.focus();
  }

  function showToast(message, variant = "success") {
    setToast({ message, visible: true, variant });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
  }

  function dismissToast() {
    clearTimeout(toastTimerRef.current);
    setToast((t) => ({ ...t, visible: false }));
  }

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/system-maintenance");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load System & Maintenance settings");
      setSettings(toFormSettings(json.data));
      setErrors({});
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
    try {
      setLastBackup(window.localStorage.getItem(LAST_BACKUP_STORAGE_KEY));
    } catch {
      // Storage can be blocked; the "Last Backup" line just stays on "Never".
    }
    return () => backupAbortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setField(field, value) {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  async function handleSave() {
    const result = validateSystemMaintenanceSettingsForm(settings);
    setErrors(result.errors);

    if (!result.valid) {
      showToast(result.message, "error");
      focusField(result.firstErrorField);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/system-maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSavePayload(settings)),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save System & Maintenance settings");
      setSettings(toFormSettings(json.data));
      showToast("System & Maintenance settings saved");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and reload your saved settings?")) return;
    loadSettings();
  }

  async function handleBackUpNow() {
    if (backup.running) return;
    const controller = new AbortController();
    backupAbortRef.current = controller;
    setSavedFile(null);
    setBackup({ running: true, percent: 0, done: 0, total: 0, table: "" });

    const parts = [];
    let summary = null;
    try {
      const res = await fetch("/api/settings/system-maintenance/backup", { method: "POST", signal: controller.signal });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to start the database backup");
      }

      await readBackupStream(res, (event) => {
        if (event.type === "start") {
          setBackup((b) => ({ ...b, total: event.totalRows }));
        } else if (event.type === "chunk") {
          parts.push(event.sql);
        } else if (event.type === "progress") {
          setBackup((b) => ({
            ...b,
            done: event.done,
            total: event.total,
            table: event.table || "",
            percent: backupPercent(event.done, event.total),
          }));
        } else if (event.type === "done") {
          summary = event;
          setBackup((b) => ({ ...b, percent: 100, done: event.rows, total: event.rows }));
        } else if (event.type === "error") {
          throw new Error(event.message);
        }
      });
      if (!summary) throw new Error("The backup was interrupted before it finished");

      const fileName = backupFileName();
      const url = URL.createObjectURL(new Blob(parts, { type: "application/sql" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);

      const finishedAt = new Date().toISOString();
      setLastBackup(finishedAt);
      try {
        window.localStorage.setItem(LAST_BACKUP_STORAGE_KEY, finishedAt);
      } catch {}
      setSavedFile({ name: fileName, size: formatBytes(summary.bytes), tables: summary.tables, rows: summary.rows });
      showToast(`Backup downloaded as ${fileName}`);
    } catch (error) {
      if (error.name !== "AbortError") showToast(error.message, "error");
    } finally {
      backupAbortRef.current = null;
      setBackup((b) => ({ ...b, running: false }));
    }
  }

  function handleCancelBackup() {
    backupAbortRef.current?.abort();
  }

  function handleClearCache() {
    showToast("Cache cleared");
  }

  return (
    <>
      <PageToolbar
        icon="server"
        title="System & Maintenance"
        onDiscard={handleDiscard}
        onSave={handleSave}
        saving={saving}
        disabled={loading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Maintenance Mode">
            <ToggleField
              label="Enable maintenance mode"
              description="Shows a maintenance page to storefront visitors while admins keep access."
              checked={settings.maintenanceModeEnabled}
              onChange={(value) => setField("maintenanceModeEnabled", value)}
              disabled={loading}
            />
            <TextAreaField
              id="f-maintenance-message"
              label="Maintenance Message"
              rows={3}
              value={settings.maintenanceMessage}
              onChange={(value) => setField("maintenanceMessage", value)}
              placeholder="We'll be back soon — thanks for your patience!"
              error={errors.maintenanceMessage}
              inputRef={maintenanceMessageInputRef}
              disabled={loading}
            />
            <ToggleField
              label="Enable debug mode"
              description="Shows verbose error output — disable in production."
              checked={settings.debugModeEnabled}
              onChange={(value) => setField("debugModeEnabled", value)}
              disabled={loading}
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
                <span className="text-slate-500 dark:text-slate-400">Last Backup (this browser)</span>
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {lastBackup ? new Date(lastBackup).toLocaleString() : "Never"}
                </span>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={handleBackUpNow}
                disabled={backup.running}
                className="px-4 h-9 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {backup.running ? `Backing up… ${backup.percent}%` : "Back Up Now"}
              </button>
              <button
                type="button"
                onClick={handleClearCache}
                className="px-4 h-9 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                Clear Cache
              </button>
            </div>

            {backup.running && (
              <div className="mt-4" aria-live="polite">
                <div className="flex items-center justify-between gap-3 text-xs mb-1.5">
                  <span className="text-slate-600 dark:text-slate-300">
                    {backup.table ? `Downloading database — ${backup.table}` : "Preparing database backup…"}
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{backup.percent}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Database backup progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={backup.percent}
                  className="h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden"
                >
                  <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${backup.percent}%` }} />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {backup.done.toLocaleString()} / {backup.total.toLocaleString()} rows
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelBackup}
                    className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!backup.running && savedFile && (
              <p className="mt-4 text-xs text-slate-600 dark:text-slate-300">
                Saved <span className="font-semibold">{savedFile.name}</span> ({savedFile.size}, {savedFile.tables} tables,{" "}
                {savedFile.rows.toLocaleString()} rows) to your browser&apos;s Downloads folder.
              </p>
            )}
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

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </>
  );
}
