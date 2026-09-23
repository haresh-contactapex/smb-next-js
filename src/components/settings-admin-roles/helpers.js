import { effectivePermissions, getAllPermissionKeys, getPermissionModules } from "@/lib/permissions";

export const STATUS_LABELS = { active: "Active", inactive: "Inactive" };

export const STATUS_BADGE_CLASSES = {
  active: "bg-success/10 text-success",
  inactive: "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400",
};

export const NAME_MAX = 100;
export const DESCRIPTION_MAX = 500;

export const EMPTY_ROLE_FORM = { name: "", description: "", status: "active", permissions: [] };

// UTC keeps the server-rendered and hydrated text identical.
export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function toFormRole(role) {
  if (!role) return EMPTY_ROLE_FORM;
  return {
    name: role.name,
    description: role.description || "",
    status: role.status,
    permissions: effectivePermissions(role),
  };
}

export function toSavePayload(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    status: form.status,
    permissions: form.permissions,
  };
}

export function validateRoleForm(form) {
  const errors = {};
  const name = form.name.trim();
  if (!name) errors.name = "Role name is required.";
  else if (name.length > NAME_MAX) errors.name = `Role name must be ${NAME_MAX} characters or fewer.`;
  if (form.description.trim().length > DESCRIPTION_MAX) {
    errors.description = `Description must be ${DESCRIPTION_MAX} characters or fewer.`;
  }
  const firstErrorField = Object.keys(errors)[0];
  return { valid: !firstErrorField, errors, firstErrorField, message: errors[firstErrorField] };
}

// { granted, total, modules: [labels of modules with any permission] }
export function summarizePermissions(role, modules = getPermissionModules()) {
  const granted = new Set(effectivePermissions(role, modules));
  return {
    granted: granted.size,
    total: getAllPermissionKeys(modules).length,
    modules: modules
      .filter((module) => module.permissions.some((permission) => granted.has(permission.key)))
      .map((module) => module.displayLabel || module.label),
  };
}
