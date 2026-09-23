import { adminPanelConfig } from "@/config/admin-panel.config";

/**
 * Roles & Permissions catalog. Pure data + helpers with no server imports, so
 * the permission matrix (client) and the role API (server) share one source
 * of truth.
 *
 * Modules are derived from the sidebar (`navItems` in
 * src/config/admin-panel.config.js), so a new top-level menu shows up in the
 * permission matrix automatically. A nav item (or a submenu child) controls
 * this through an optional `permissions` field:
 *
 *   (omitted)                        top-level item -> module keyed by its `id`
 *                                    (known module if the id matches one below,
 *                                    otherwise View/Create/Edit/Delete)
 *   permissions: false               no module for this menu
 *   permissions: "orders"            map onto a known module
 *   permissions: ["categories", "products"]
 *   permissions: { key, label, actions: ["view", "edit"] }  custom module
 *   permissions: { children: true, actions: ["view", "edit"] }
 *                                    group menu (Settings): every submenu page
 *                                    is its own module, keyed "<menu id>-<page id>"
 *                                    and shown as its own row under the menu
 *
 * In an ordinary submenu the pages belong to the menu's module (listed under
 * its row in the matrix) unless a page sets its own `permissions`.
 * Permission keys are "<module>.<action>" and are what admin_roles stores, so
 * renaming a nav item's `id` orphans the permissions granted for it.
 */

export const STANDARD_ACTIONS = ["view", "create", "edit", "delete", "import", "export"];

export const DEFAULT_MODULE_ACTIONS = ["view", "create", "edit", "delete"];

// `noun` picks the module's singular or plural name for the full label
// ("Create Product" vs "View Products"); `label` overrides it entirely.
export const ACTIONS = {
  view: { label: "View", noun: "plural" },
  create: { label: "Create", noun: "singular" },
  edit: { label: "Edit", noun: "singular" },
  delete: { label: "Delete", noun: "singular", danger: true },
  import: { label: "Import", noun: "plural" },
  export: { label: "Export", noun: "plural" },
  cancel: { label: "Cancel", noun: "singular", danger: true },
  refund: { label: "Refund", noun: "singular", danger: true },
  approve: { label: "Approve", noun: "plural" },
  publish: { label: "Publish", noun: "singular" },
  manage_roles: { label: "Manage Roles", danger: true },
  manage_permissions: { label: "Manage Permissions", danger: true },
};

// Modules with a known action set. `alwaysInclude` modules appear even when
// no sidebar menu points at them yet (e.g. Reports before its page exists).
export const KNOWN_MODULES = {
  dashboard: { label: "Dashboard", singular: "Dashboard", plural: "Dashboard", actions: ["view"] },
  products: {
    label: "Products",
    singular: "Product",
    plural: "Products",
    actions: ["view", "create", "edit", "delete", "import", "export"],
  },
  categories: {
    label: "Categories",
    singular: "Category",
    plural: "Categories",
    actions: ["view", "create", "edit", "delete"],
  },
  orders: {
    label: "Orders",
    singular: "Order",
    plural: "Orders",
    actions: ["view", "create", "edit", "cancel", "refund", "export"],
  },
  customers: {
    label: "Customers",
    singular: "Customer",
    plural: "Customers",
    actions: ["view", "create", "edit", "delete", "export"],
  },
  inventory: {
    label: "Inventory",
    singular: "Inventory",
    plural: "Inventory",
    actions: ["view", "edit", "import", "export"],
    alwaysInclude: true,
  },
  coupons: {
    label: "Coupons & Promotions",
    singular: "Coupon",
    plural: "Coupons",
    actions: ["view", "create", "edit", "delete"],
  },
  reviews: {
    label: "Reviews",
    singular: "Reviews",
    plural: "Reviews",
    actions: ["view", "approve", "edit", "delete"],
    alwaysInclude: true,
  },
  content: {
    label: "Content / CMS",
    singular: "Content",
    plural: "Content",
    actions: ["view", "create", "edit", "delete", "publish"],
    alwaysInclude: true,
  },
  reports: {
    label: "Reports",
    singular: "Report",
    plural: "Reports",
    actions: ["view", "export"],
    alwaysInclude: true,
  },
  users: {
    label: "Users / Administrators",
    singular: "User",
    plural: "Users",
    actions: ["view", "create", "edit", "delete", "manage_roles", "manage_permissions"],
    alwaysInclude: true,
  },
};

export const MANAGE_ROLES_PERMISSION = "users.manage_roles";
export const MANAGE_PERMISSIONS_PERMISSION = "users.manage_permissions";

// Settings is a group menu, so each settings page has its own module
// ("settings-<page id>", matching /settings/<page id>) with View and Edit.
export function settingsPermission(page, action) {
  return `settings-${page}.${action}`;
}

export function permissionKey(moduleKey, action) {
  return `${moduleKey}.${action}`;
}

function actionLabel(action) {
  return ACTIONS[action]?.label || action.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildModule(key, { label, singular, plural, actions }, source) {
  const validActions = (Array.isArray(actions) && actions.length ? actions : DEFAULT_MODULE_ACTIONS).filter(
    (action, index, list) => typeof action === "string" && action && list.indexOf(action) === index
  );
  return {
    key,
    label,
    source,
    permissions: validActions.map((action) => {
      const meta = ACTIONS[action] || {};
      const noun = meta.noun === "singular" ? singular || label : plural || label;
      return {
        key: permissionKey(key, action),
        action,
        actionLabel: actionLabel(action),
        label: meta.noun ? `${actionLabel(action)} ${noun}` : actionLabel(action),
        danger: Boolean(meta.danger),
        standard: STANDARD_ACTIONS.includes(action),
      };
    }),
  };
}

// A submenu whose pages each get their own module: `permissions: { children: true }`.
function isGroupMenu(item) {
  return item.type === "submenu" && Boolean(item.permissions?.children);
}

// Normalizes one nav item's own `permissions` into module specs, or [] to skip.
function moduleSpecsFor(item, isTopLevel) {
  const setting = item.permissions;
  if (setting === false || isGroupMenu(item)) return [];
  if (setting === undefined) {
    if (!isTopLevel) return [];
    return [KNOWN_MODULES[item.id] ? { key: item.id } : { key: item.id, label: item.label }];
  }
  const entries = Array.isArray(setting) ? setting : [setting];
  return entries
    .map((entry) => (typeof entry === "string" ? { key: entry } : entry))
    .filter((entry) => entry && typeof entry.key === "string" && entry.key);
}

// Modules a submenu page defines: its own `permissions` if set; in a group
// menu an automatic "<menu id>-<page id>" module; otherwise none (the page
// belongs to its menu's module).
function childModuleSpecs(parent, child) {
  if (child.permissions !== undefined) return moduleSpecsFor(child, false);
  if (!isGroupMenu(parent)) return [];
  const noun = `${parent.label} › ${child.label}`;
  return [
    {
      key: `${parent.id}-${child.id}`,
      label: child.label,
      singular: noun,
      plural: noun,
      actions: parent.permissions.actions,
      auto: true,
    },
  ];
}

/**
 * Builds the ordered permission-matrix modules for a nav config: sidebar
 * order first, then any `alwaysInclude` modules not referenced by a menu.
 *
 * Each module also carries:
 *   group        { key, label, expanded } — the top-level menu it came from;
 *                `expanded` for group menus, whose pages are separate rows
 *   pages        sidebar pages it covers (e.g. Orders → Pending, Processing)
 *   displayLabel for automatic group-menu pages, prefixed with the menu:
 *                "Settings › Store"
 */
export function buildPermissionModules(navItems = []) {
  const modules = [];
  const byKey = new Map();

  function add(spec, source, group, page) {
    let entry = byKey.get(spec.key);
    if (!entry) {
      const known = KNOWN_MODULES[spec.key];
      const definition = known
        ? { ...known, ...(spec.actions ? { actions: spec.actions } : {}), ...(spec.label ? { label: spec.label } : {}) }
        : {
            label: spec.label || spec.key,
            singular: spec.singular || spec.label,
            plural: spec.plural || spec.label,
            actions: spec.actions,
          };
      entry = buildModule(spec.key, definition, source);
      entry.group = group;
      entry.pages = [];
      entry.displayLabel = spec.auto ? `${group.label} › ${entry.label}` : entry.label;
      modules.push(entry);
      byKey.set(spec.key, entry);
    }
    if (page) {
      const label = entry.group?.key === group?.key ? page : `${group.label} › ${page}`;
      if (label !== entry.label && !entry.pages.includes(label)) entry.pages.push(label);
    }
  }

  for (const item of navItems) {
    if (item.type === "section") continue;
    const group = { key: item.id, label: item.label, expanded: isGroupMenu(item) };
    const own = moduleSpecsFor(item, true);
    own.forEach((spec) => add(spec, "sidebar", group));
    if (item.type !== "submenu") continue;
    for (const child of item.items || []) {
      const specs = childModuleSpecs(item, child);
      if (specs.length) specs.forEach((spec) => add(spec, "sidebar", group, child.label));
      else if (own.length === 1) add(own[0], "sidebar", group, child.label);
    }
  }

  const other = { key: "__other", label: "Not in the sidebar yet", expanded: false, system: true };
  for (const [key, definition] of Object.entries(KNOWN_MODULES)) {
    if (definition.alwaysInclude) add({ key }, "system", other);
  }

  return modules;
}

// The one permission module a nav item maps to, or null when it maps to
// none (`permissions: false`, a group menu) or to several.
export function navItemModuleKey(item, isTopLevel = true) {
  const specs = moduleSpecsFor(item, isTopLevel);
  return specs.length === 1 ? specs[0].key : null;
}

// The module a submenu page is gated by: its own, or its menu's.
export function navChildModuleKey(parent, child) {
  const specs = childModuleSpecs(parent, child);
  if (specs.length) return specs.length === 1 ? specs[0].key : null;
  return navItemModuleKey(parent, true);
}

/**
 * Maps each sidebar href to the permission module it belongs to, so a page
 * under a menu is gated by that module's View permission without an
 * explicit route rule.
 */
export function buildNavModuleIndex(navItems = []) {
  const index = [];
  for (const item of navItems) {
    if (item.type === "section") continue;
    const entries =
      item.type === "submenu"
        ? (item.items || []).map((child) => [child.href, navChildModuleKey(item, child)])
        : [[item.href, navItemModuleKey(item, true)]];
    for (const [href, moduleKey] of entries) {
      if (href && href !== "#" && moduleKey) index.push({ href, moduleKey });
    }
  }
  return index;
}

let cachedModules;

export function getPermissionModules() {
  if (!cachedModules) cachedModules = buildPermissionModules(adminPanelConfig.navItems);
  return cachedModules;
}

export function getAllPermissionKeys(modules = getPermissionModules()) {
  return modules.flatMap((module) => module.permissions.map((permission) => permission.key));
}

// Keeps only keys for permissions that currently exist, de-duplicated and in
// matrix order — drops anything stale (a removed menu) or made up by a client.
export function sanitizePermissions(keys, modules = getPermissionModules()) {
  const wanted = new Set(Array.isArray(keys) ? keys.filter((key) => typeof key === "string") : []);
  return getAllPermissionKeys(modules).filter((key) => wanted.has(key));
}

export function roleHasPermission(role, key) {
  if (!role || role.status !== "active") return false;
  return Boolean(role.fullAccess) || (Array.isArray(role.permissions) && role.permissions.includes(key));
}

// Effective permission keys for display: a full-access role holds all of them.
export function effectivePermissions(role, modules = getPermissionModules()) {
  if (role?.fullAccess) return getAllPermissionKeys(modules);
  return sanitizePermissions(role?.permissions, modules);
}
