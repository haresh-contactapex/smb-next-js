"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/admin-panel/Icon";
import SectionCard from "@/components/settings-shared/SectionCard";
import PermissionMatrix from "./PermissionMatrix";
import Toast from "./Toast";
import RolesPageHeader, { DANGER_BUTTON_CLASSES, PRIMARY_BUTTON_CLASSES, SECONDARY_BUTTON_CLASSES } from "./RolesPageHeader";
import { STATUS_BADGE_CLASSES, STATUS_LABELS, formatDate } from "./helpers";
import {
  confirmDelete,
  confirmStatusChange,
  deleteBlockedReason,
  deleteRole,
  duplicateRole,
  setRoleStatus,
} from "./roleActions";
import { effectivePermissions, getPermissionModules } from "@/lib/permissions";

// Keep in sync with AUTO_DISMISS_MS in the shared Add Product toast.
const TOAST_AUTO_DISMISS_MS = 10000;

const SAVED_MESSAGES = { created: "Role created", updated: "Role saved" };

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm text-slate-700 dark:text-slate-200">{children}</dd>
    </div>
  );
}

export default function RoleView({ role: initialRole, saved }) {
  const router = useRouter();
  const modules = useMemo(() => getPermissionModules(), []);
  const [role, setRole] = useState(initialRole);
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });
  const busyRef = useRef(false);
  const toastTimerRef = useRef(null);

  function showToast(message, variant = "success") {
    setToast({ message, visible: true, variant });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), TOAST_AUTO_DISMISS_MS);
  }

  function dismissToast() {
    clearTimeout(toastTimerRef.current);
    setToast((t) => ({ ...t, visible: false }));
  }

  // Confirms a save made on the edit screen, then drops ?saved= so a reload
  // doesn't repeat the message.
  useEffect(() => {
    if (!SAVED_MESSAGES[saved]) return;
    showToast(SAVED_MESSAGES[saved]);
    router.replace(`/settings/admin-roles/${initialRole.id}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runAction(name, action) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(name);
    try {
      await action();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  }

  function handleDuplicate() {
    runAction("duplicate", async () => {
      const copy = await duplicateRole(role);
      router.push(`/settings/admin-roles/${copy.id}/edit`);
    });
  }

  function handleToggleStatus() {
    const nextStatus = role.status === "active" ? "inactive" : "active";
    if (!confirmStatusChange(role, nextStatus)) return;
    runAction("status", async () => {
      setRole(await setRoleStatus(role, nextStatus));
      showToast(`Role ${nextStatus === "active" ? "activated" : "deactivated"}`);
    });
  }

  function handleDelete() {
    if (!confirmDelete(role)) return;
    runAction("delete", async () => {
      await deleteRole(role);
      router.push("/settings/admin-roles");
      router.refresh();
    });
  }

  const blockedReason = deleteBlockedReason(role);
  const permissions = effectivePermissions(role, modules);

  return (
    <div className="space-y-6">
      <RolesPageHeader title={role.name} crumb={role.name}>
        <Link href="/settings/admin-roles" className={SECONDARY_BUTTON_CLASSES}>
          <Icon name="chevron-left" className="w-4 h-4" />
          All Roles
        </Link>
        <button type="button" onClick={handleDuplicate} disabled={Boolean(busy)} className={SECONDARY_BUTTON_CLASSES}>
          <Icon name="copy" className="w-4 h-4" />
          {busy === "duplicate" ? "Duplicating…" : "Duplicate"}
        </button>
        {!role.isSystem && (
          <button type="button" onClick={handleToggleStatus} disabled={Boolean(busy)} className={SECONDARY_BUTTON_CLASSES}>
            <Icon name={role.status === "active" ? "x-circle" : "check-circle"} className="w-4 h-4" />
            {busy === "status" ? "Updating…" : role.status === "active" ? "Deactivate" : "Activate"}
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          disabled={Boolean(busy) || Boolean(blockedReason)}
          title={blockedReason || "Delete role"}
          className={DANGER_BUTTON_CLASSES}
        >
          <Icon name="trash-2" className="w-4 h-4" />
          {busy === "delete" ? "Deleting…" : "Delete"}
        </button>
        <Link href={`/settings/admin-roles/${role.id}/edit`} className={PRIMARY_BUTTON_CLASSES}>
          <Icon name="edit-2" className="w-4 h-4" />
          Edit Role
        </Link>
      </RolesPageHeader>

      <SectionCard title="Role Details">
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Detail label="Status">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${STATUS_BADGE_CLASSES[role.status]}`}>
              {STATUS_LABELS[role.status] || role.status}
            </span>
            {role.isSystem && (
              <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                <Icon name="lock" className="w-3 h-3" />
                System role
              </span>
            )}
          </Detail>
          <Detail label="Users Assigned">{role.usersAssigned}</Detail>
          <Detail label="Created">{formatDate(role.createdAt)}</Detail>
          <Detail label="Updated">{formatDate(role.updatedAt)}</Detail>
          <div className="sm:col-span-2 lg:col-span-4">
            <Detail label="Description">
              {role.description ? (
                <span className="whitespace-pre-line">{role.description}</span>
              ) : (
                <span className="text-slate-400">No description</span>
              )}
            </Detail>
          </div>
        </dl>
        {blockedReason && (
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <Icon name="lock" className="w-3.5 h-3.5" />
            {blockedReason}.
          </p>
        )}
      </SectionCard>

      <SectionCard
        title={
          <>
            <span>Permissions</span>
            <span className="text-[11px] font-medium text-slate-400">· read-only</span>
            {!role.fullAccess && (
              <Link
                href={`/settings/admin-roles/${role.id}/edit`}
                className="ml-auto inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-primary-500 dark:bg-accent-500 hover:bg-primary-600 dark:hover:bg-accent-600 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Icon name="edit-2" className="w-3.5 h-3.5" />
                Edit Permissions
              </Link>
            )}
          </>
        }
      >
        <PermissionMatrix modules={modules} selected={permissions} onChange={() => {}} readOnly fullAccess={role.fullAccess} />
      </SectionCard>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </div>
  );
}
