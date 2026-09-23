"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/admin-panel/Icon";
import RolesPageHeader, { PRIMARY_BUTTON_CLASSES } from "./RolesPageHeader";
import RolesFilters from "./RolesFilters";
import RolesTable from "./RolesTable";
import Toast from "./Toast";
import { confirmDelete, confirmStatusChange, deleteRole, duplicateRole, setRoleStatus } from "./roleActions";
import { getPermissionModules } from "@/lib/permissions";

// Keep in sync with AUTO_DISMISS_MS in the shared Add Product toast.
const TOAST_AUTO_DISMISS_MS = 10000;

export default function RolesListing({ roles: initialRoles }) {
  const router = useRouter();
  const modules = useMemo(() => getPermissionModules(), []);
  const [roles, setRoles] = useState(initialRoles);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState(null);
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

  // One role action at a time, so a double-click can't fire two requests.
  async function runAction(role, action) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusyId(role.id);
    try {
      await action();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      busyRef.current = false;
      setBusyId(null);
    }
  }

  function handleDuplicate(role) {
    runAction(role, async () => {
      const copy = await duplicateRole(role);
      router.push(`/settings/admin-roles/${copy.id}/edit`);
    });
  }

  function handleDelete(role) {
    if (!confirmDelete(role)) return;
    runAction(role, async () => {
      await deleteRole(role);
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
      showToast(`"${role.name}" deleted`);
      router.refresh();
    });
  }

  function handleToggleStatus(role, nextStatus) {
    if (!confirmStatusChange(role, nextStatus)) return;
    runAction(role, async () => {
      const updated = await setRoleStatus(role, nextStatus);
      setRoles((prev) => prev.map((r) => (r.id === role.id ? updated : r)));
      showToast(`"${role.name}" ${nextStatus === "active" ? "activated" : "deactivated"}`);
    });
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roles.filter((role) => {
      if (q && !role.name.toLowerCase().includes(q) && !role.description.toLowerCase().includes(q)) return false;
      if (status && role.status !== status) return false;
      return true;
    });
  }, [roles, search, status]);

  const activeCount = roles.filter((role) => role.status === "active").length;

  return (
    <>
      <RolesPageHeader title="Roles & Permissions">
        <Link href="/settings/admin-roles/new" className={PRIMARY_BUTTON_CLASSES}>
          <Icon name="plus-circle" className="w-4 h-4" />
          Add New Role
        </Link>
      </RolesPageHeader>

      <p className="text-sm text-slate-500 dark:text-slate-400 -mt-2">
        {roles.length} role{roles.length === 1 ? "" : "s"} · {activeCount} active. Control which modules and actions each
        administrator role can access.
      </p>

      <RolesFilters
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        resultCount={filtered.length}
        hasActiveFilters={Boolean(search || status)}
        onClear={() => {
          setSearch("");
          setStatus("");
        }}
      />

      <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
        <RolesTable
          roles={filtered}
          modules={modules}
          busyId={busyId}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
        />
      </section>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </>
  );
}
