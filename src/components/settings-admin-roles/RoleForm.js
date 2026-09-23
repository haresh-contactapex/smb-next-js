"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SectionCard from "@/components/settings-shared/SectionCard";
import TextField from "@/components/settings-shared/TextField";
import TextAreaField from "@/components/settings-shared/TextAreaField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "./Toast";
import PermissionMatrix from "./PermissionMatrix";
import RolesPageHeader, { PRIMARY_BUTTON_CLASSES, SECONDARY_BUTTON_CLASSES } from "./RolesPageHeader";
import { STATUS_LABELS, DESCRIPTION_MAX, toFormRole, toSavePayload, validateRoleForm } from "./helpers";
import { getPermissionModules } from "@/lib/permissions";
import { useCan } from "@/components/providers/StaffPermissionsProvider";

// Keep in sync with AUTO_DISMISS_MS in the shared Add Product toast.
const TOAST_AUTO_DISMISS_MS = 10000;

export default function RoleForm({ role: initialRole = null, saved }) {
  const router = useRouter();
  const modules = useMemo(() => getPermissionModules(), []);
  // Changing a role's permissions needs Manage Permissions on top of the
  // Manage Roles this screen requires (the API enforces the same rule).
  const canEditPermissions = useCan()("users.manage_permissions");

  // `role` / `savedForm` track the last saved version, so after Save the
  // form stays editable here and "unsaved changes" compares against it.
  const [role, setRole] = useState(initialRole);
  const [savedForm, setSavedForm] = useState(() => toFormRole(initialRole));
  const [form, setForm] = useState(savedForm);
  const isEdit = Boolean(role);
  const isSystem = Boolean(role?.isSystem);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });
  const savingRef = useRef(false);
  const toastTimerRef = useRef(null);
  const nameInputRef = useRef(null);
  const descriptionInputRef = useRef(null);
  const fieldRefs = { name: nameInputRef, description: descriptionInputRef };

  const dirty = JSON.stringify(form) !== JSON.stringify(savedForm);

  function showToast(message, variant = "success") {
    setToast({ message, visible: true, variant });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), TOAST_AUTO_DISMISS_MS);
  }

  function dismissToast() {
    clearTimeout(toastTimerRef.current);
    setToast((t) => ({ ...t, visible: false }));
  }

  // A new role lands here after creation (?saved=created): confirm it, then
  // drop the query so a reload doesn't repeat the message.
  useEffect(() => {
    if (saved !== "created" || !initialRole) return;
    showToast("Role created. You can keep adjusting its permissions here.");
    router.replace(`/settings/admin-roles/${initialRole.id}/edit`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    if (savingRef.current) return;

    const result = validateRoleForm(form);
    setErrors(result.errors);
    if (!result.valid) {
      showToast(result.message, "error");
      fieldRefs[result.firstErrorField]?.current?.focus();
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const res = await fetch(isEdit ? `/api/admin-roles/${role.id}` : "/api/admin-roles", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSavePayload(form)),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save role");

      if (!isEdit) {
        // Continue on the new role's edit screen, checkboxes and all.
        router.replace(`/settings/admin-roles/${json.data.id}/edit?saved=created`);
        return;
      }
      const nextForm = toFormRole(json.data);
      setRole(json.data);
      setSavedForm(nextForm);
      setForm(nextForm);
      setErrors({});
      showToast("Role saved");
      router.refresh();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function handleCancel(e) {
    if (dirty && !window.confirm("Discard your unsaved changes?")) e.preventDefault();
  }

  const title = isEdit ? `Edit Role: ${role.name}` : "Add New Role";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <RolesPageHeader title={title} crumb={isEdit ? "Edit Role" : "Add New Role"}>
        <Link href={isEdit ? `/settings/admin-roles/${role.id}` : "/settings/admin-roles"} onClick={handleCancel} className={SECONDARY_BUTTON_CLASSES}>
          {dirty ? "Cancel" : "Back"}
        </Link>
        <button type="submit" disabled={saving} className={PRIMARY_BUTTON_CLASSES}>
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Role"}
        </button>
      </RolesPageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <SectionCard title="Role Details">
            <TextField
              id="f-role-name"
              label="Role Name *"
              value={form.name}
              onChange={(value) => setField("name", value)}
              placeholder="e.g. Warehouse Staff"
              error={errors.name}
              hint={isSystem ? "System role names can't be changed." : undefined}
              inputRef={nameInputRef}
              disabled={isSystem || saving}
            />
            <TextAreaField
              id="f-role-description"
              label="Description"
              rows={3}
              value={form.description}
              onChange={(value) => setField("description", value)}
              placeholder="What is this role responsible for?"
              hint={`${form.description.length} / ${DESCRIPTION_MAX}`}
              error={errors.description}
              inputRef={descriptionInputRef}
              disabled={saving}
            />
            <fieldset>
              <legend className="field-label">Status</legend>
              <div className="flex flex-wrap gap-2">
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <label
                    key={value}
                    className={`inline-flex items-center gap-2 px-3 h-9 rounded-xl border text-sm font-medium transition-colors ${
                      form.status === value
                        ? "border-primary-400 bg-primary-50 text-primary-700 dark:border-accent-500 dark:bg-accent-500/10 dark:text-accent-300"
                        : "border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-300"
                    } ${isSystem ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <input
                      type="radio"
                      name="role-status"
                      value={value}
                      checked={form.status === value}
                      onChange={() => setField("status", value)}
                      disabled={isSystem || saving}
                      className="accent-primary-500 dark:accent-accent-500"
                    />
                    {label}
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {isSystem ? "System roles are always active." : "An inactive role grants no permissions to its users."}
              </p>
            </fieldset>
          </SectionCard>
        </div>

        <InfoSidebar
          icon="shield"
          title="About Roles"
          points={[
            "Grant only the access a role needs — you can always add more later.",
            "Permissions marked in red delete data, move money or change who can access the panel.",
            "New sidebar menus appear in the permission table automatically, unselected for existing roles.",
          ]}
        />
      </div>

      <SectionCard title="Permissions">
        {!canEditPermissions && !role?.fullAccess && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Your role can edit role details but not permissions (Manage Permissions is required).
          </p>
        )}
        <PermissionMatrix
          modules={modules}
          selected={form.permissions}
          onChange={(permissions) => setField("permissions", permissions)}
          readOnly={!canEditPermissions}
          fullAccess={Boolean(role?.fullAccess)}
        />
      </SectionCard>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </form>
  );
}
