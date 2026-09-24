"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/admin-panel/Icon";
import SectionCard from "@/components/settings-shared/SectionCard";
import TextField from "@/components/settings-shared/TextField";
import TextAreaField from "@/components/settings-shared/TextAreaField";
import SelectField from "@/components/settings-shared/SelectField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import PasswordField from "@/components/auth/PasswordField";
import Toast from "./Toast";
import UsersPageHeader, { DANGER_BUTTON_CLASSES, PRIMARY_BUTTON_CLASSES, SECONDARY_BUTTON_CLASSES } from "./UsersPageHeader";
import { BIO_MAX, formatDate, fullName, isLocked, toFormUser, toSavePayload, validateUserForm } from "./helpers";
import { confirmDelete, deleteBlockedReason, deleteUser } from "./userActions";
import { formatUsPhone } from "@/lib/phone";
import { LANGUAGES, TIMEZONES } from "@/data/accountData";

// Keep in sync with AUTO_DISMISS_MS in the shared Add Product toast.
const TOAST_AUTO_DISMISS_MS = 10000;

export default function UserForm({ user = null, roles, currentUserId, actorFullAccess, canDelete = false }) {
  const router = useRouter();
  const isEdit = Boolean(user);
  const isSelf = isEdit && user.id === currentUserId;
  const locked = isEdit && isLocked(user);
  const defaultRole = useMemo(() => roles.find((r) => r.status === "active" && !r.fullAccess)?.slug || "", [roles]);
  const initialForm = useMemo(() => toFormUser(user, defaultRole), [user, defaultRole]);

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });
  const busyRef = useRef(false);
  const toastTimerRef = useRef(null);
  const fieldRefs = {
    firstName: useRef(null),
    lastName: useRef(null),
    email: useRef(null),
    phone: useRef(null),
    role: useRef(null),
    bio: useRef(null),
    password: useRef(null),
    confirmPassword: useRef(null),
  };

  const busy = saving || deleting;
  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm);
  const deleteBlocked = isEdit ? deleteBlockedReason(user, { currentUserId, actorFullAccess }) : null;

  // Full-access roles can only be handed out by a Super Admin; the user's
  // current role always stays selectable so an edit doesn't silently change it.
  const roleOptions = useMemo(
    () => [
      ...(form.role ? [] : [{ value: "", label: "Select a role", disabled: true }]),
      ...roles.map((r) => ({
        value: r.slug,
        label: `${r.name}${r.status === "inactive" ? " (inactive)" : ""}`,
        disabled: r.fullAccess && !actorFullAccess && r.slug !== user?.role,
      })),
      ...(user && !roles.some((r) => r.slug === user.role) ? [{ value: user.role, label: `${user.role} (missing role)` }] : []),
    ],
    [roles, actorFullAccess, user, form.role]
  );
  const selectedRole = roles.find((r) => r.slug === form.role);

  function showToast(message, variant = "success") {
    setToast({ message, visible: true, variant });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), TOAST_AUTO_DISMISS_MS);
  }

  function dismissToast() {
    clearTimeout(toastTimerRef.current);
    setToast((t) => ({ ...t, visible: false }));
  }

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    if (busyRef.current) return;

    const result = validateUserForm(form, { isEdit });
    setErrors(result.errors);
    if (!result.valid) {
      showToast(result.message, "error");
      fieldRefs[result.firstErrorField]?.current?.focus();
      return;
    }

    busyRef.current = true;
    setSaving(true);
    try {
      const res = await fetch(isEdit ? `/api/users/${user.id}` : "/api/users", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSavePayload(form)),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        const error = new Error(json.error || "Failed to save user");
        error.field = json.field;
        throw error;
      }
      const saved = isEdit ? "updated" : json.data.welcomeEmailSent ? "created" : "created-no-email";
      router.push(`/users?saved=${saved}`);
      router.refresh();
    } catch (error) {
      if (error.field && fieldRefs[error.field]) {
        setErrors((prev) => ({ ...prev, [error.field]: error.message }));
        fieldRefs[error.field].current?.focus();
      }
      showToast(error.message, "error");
      busyRef.current = false;
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (busyRef.current || !confirmDelete(user)) return;
    busyRef.current = true;
    setDeleting(true);
    try {
      await deleteUser(user);
      router.push("/users");
      router.refresh();
    } catch (error) {
      showToast(error.message, "error");
      busyRef.current = false;
      setDeleting(false);
    }
  }

  function handleCancel(e) {
    if (dirty && !window.confirm("Discard your unsaved changes?")) e.preventDefault();
  }

  const title = isEdit ? `Edit User: ${fullName(user)}` : "Add User";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <UsersPageHeader title={title} crumb={isEdit ? "Edit User" : "Add User"}>
        {isEdit && canDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy || Boolean(deleteBlocked)}
            title={deleteBlocked || undefined}
            className={DANGER_BUTTON_CLASSES}
          >
            <Icon name={deleting ? "refresh-cw" : "trash-2"} className={`w-4 h-4${deleting ? " animate-spin" : ""}`} />
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
        <Link href="/users" onClick={handleCancel} className={SECONDARY_BUTTON_CLASSES}>
          Cancel
        </Link>
        <button type="submit" disabled={busy} className={PRIMARY_BUTTON_CLASSES}>
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create User"}
        </button>
      </UsersPageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="User Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="f-user-first-name"
                label="First Name *"
                value={form.firstName}
                onChange={(value) => setField("firstName", value)}
                placeholder="e.g. Jane"
                error={errors.firstName}
                inputRef={fieldRefs.firstName}
                disabled={busy}
              />
              <TextField
                id="f-user-last-name"
                label="Last Name *"
                value={form.lastName}
                onChange={(value) => setField("lastName", value)}
                placeholder="e.g. Doe"
                error={errors.lastName}
                inputRef={fieldRefs.lastName}
                disabled={busy}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="f-user-email"
                label="Email *"
                type="email"
                value={form.email}
                onChange={(value) => setField("email", value)}
                placeholder="jane@example.com"
                error={errors.email}
                hint="Used to sign in to the admin panel."
                inputRef={fieldRefs.email}
                disabled={busy}
              />
              <TextField
                id="f-user-phone"
                label="Phone"
                type="tel"
                value={form.phone}
                onChange={(value) => setField("phone", formatUsPhone(value))}
                placeholder="(555) 123-4567"
                error={errors.phone}
                inputRef={fieldRefs.phone}
                disabled={busy}
              />
            </div>
            <TextAreaField
              id="f-user-bio"
              label="Bio"
              rows={3}
              value={form.bio}
              onChange={(value) => setField("bio", value)}
              placeholder="Short note about this team member"
              hint={`${form.bio.length} / ${BIO_MAX}`}
              error={errors.bio}
              inputRef={fieldRefs.bio}
              disabled={busy}
            />
          </SectionCard>

          <SectionCard title="Access">
            <SelectField
              id="f-user-role"
              label="Role *"
              value={form.role}
              options={roleOptions}
              onChange={(value) => setField("role", value)}
              error={errors.role}
              hint={
                isSelf
                  ? "You can't change your own role."
                  : selectedRole?.status === "inactive"
                    ? "This role is inactive, so it grants no permissions until it's reactivated."
                    : selectedRole?.description || undefined
              }
              inputRef={fieldRefs.role}
              disabled={busy || isSelf}
            />
            <ToggleField
              icon="shield"
              label="Two-Factor Authentication"
              description="Marks this account as using 2FA at sign-in."
              checked={form.twoFactorEnabled}
              onChange={(value) => setField("twoFactorEnabled", value)}
              disabled={busy}
            />
            {locked && (
              <ToggleField
                icon="lock"
                label="Unlock account"
                description={`Locked after too many failed sign-in attempts. Clears the lock and the failed-attempt count on save.`}
                checked={form.unlock}
                onChange={(value) => setField("unlock", value)}
                disabled={busy}
              />
            )}
          </SectionCard>

          {isEdit && (
          <SectionCard title="Password">
            <p className="text-xs text-slate-400 -mt-2">
              Leave blank to keep the current password. Use at least 8 characters with letters, numbers and a special
              character.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PasswordField
                id="f-user-password"
                label="New Password"
                value={form.password}
                onChange={(value) => setField("password", value)}
                placeholder="••••••••"
                error={errors.password}
                autoComplete="new-password"
                inputRef={fieldRefs.password}
                showStrength
              />
              <PasswordField
                id="f-user-confirm-password"
                label="Confirm New Password"
                value={form.confirmPassword}
                onChange={(value) => setField("confirmPassword", value)}
                placeholder="••••••••"
                error={
                  errors.confirmPassword ||
                  (form.confirmPassword && form.confirmPassword !== form.password ? "Passwords don't match." : null)
                }
                autoComplete="new-password"
                inputRef={fieldRefs.confirmPassword}
              />
            </div>
          </SectionCard>
          )}

          {!isEdit && (
            <section className="flex items-start gap-3 rounded-2xl border border-primary-100 bg-primary-50/60 p-4 dark:border-accent-500/20 dark:bg-accent-500/5">
              <Icon name="mail" className="w-5 h-5 shrink-0 text-primary-600 dark:text-accent-400" />
              <p className="text-xs text-slate-600 dark:text-slate-300">
                <span className="block text-sm font-semibold text-slate-800 dark:text-white">Password is sent by email</span>
                On Create User, a welcome email goes to the address above with a randomly generated password and a
                link to set their own password (valid for 72 hours).
              </p>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <SectionCard title="Preferences">
            <SelectField
              id="f-user-language"
              label="Language"
              value={form.language}
              options={LANGUAGES}
              onChange={(value) => setField("language", value)}
              disabled={busy}
            />
            <SelectField
              id="f-user-timezone"
              label="Timezone"
              value={form.timezone}
              options={TIMEZONES}
              onChange={(value) => setField("timezone", value)}
              disabled={busy}
            />
          </SectionCard>

          {isEdit && (
            <SectionCard title="Account">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</dt>
                  <dd className={`mt-1 font-semibold ${locked ? "text-error" : "text-success"}`}>{locked ? "Locked" : "Active"}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Last Login</dt>
                  <dd className="mt-1 text-slate-700 dark:text-slate-200">{user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Created</dt>
                  <dd className="mt-1 text-slate-700 dark:text-slate-200">{formatDate(user.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Updated</dt>
                  <dd className="mt-1 text-slate-700 dark:text-slate-200">{formatDate(user.updatedAt)}</dd>
                </div>
              </dl>
            </SectionCard>
          )}

          <InfoSidebar
            icon="users"
            title="About Users"
            points={[
              "Users are staff accounts that sign in to this admin panel — customers are managed separately.",
              "A user's role decides what they can see and do. Manage roles in Settings → Admin & Roles.",
              "Only a Super Admin can create, change or delete another Super Admin.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </form>
  );
}
