import { adminPanelConfig } from "@/config/admin-panel.config";
import { buildNavModuleIndex, navChildModuleKey, navItemModuleKey, roleHasPermission, settingsPermission } from "./permissions";

/**
 * Which permission a staff member needs to open an admin page. Pure (no
 * server imports) so middleware, the root layout (sidebar filtering) and
 * tests share one table.
 *
 * Resolution order:
 *   1. OPEN_PATHS — personal pages every signed-in staff member can use.
 *   2. ROUTE_RULES — explicit rules, first match wins.
 *   3. The sidebar: a path under a menu's href needs that menu's module
 *      View permission (see buildNavModuleIndex). This is what gates pages
 *      for menus added to the sidebar later without touching this file.
 *   4. Any other /settings/<page> needs that page's own View permission, so
 *      a settings page missing from the sidebar is still locked.
 *   5. Anything else only needs a signed-in session.
 */

// My Account pages (the staff member's own profile, addresses, payment
// methods and gift cards) plus the pages middleware itself relies on.
const OPEN_PATHS = ["/profile", "/address", "/payment", "/gift-cards", "/access-denied", "/maintenance"];

// `path` matches exactly; `prefix` matches the path and anything below it.
const ROUTE_RULES = [
  { path: "/", permission: "dashboard.view" },

  { prefix: "/orders", permission: "orders.view" },

  { path: "/all-customers", permission: "customers.view" },
  { path: "/add-customer", permission: "customers.create" },
  { prefix: "/edit-customer", permission: "customers.edit" },

  { path: "/categories", permission: "categories.view" },
  { path: "/add-category", permission: "categories.create" },
  { prefix: "/edit-category", permission: "categories.edit" },

  { path: "/all-products/import", permission: "products.import" },
  { path: "/all-products", permission: "products.view" },
  { path: "/add-product", permission: "products.create" },
  { prefix: "/edit-product", permission: "products.edit" },

  { path: "/all-coupons", permission: "coupons.view" },
  { path: "/create-coupon", permission: "coupons.create" },
  { prefix: "/edit-coupon", permission: "coupons.edit" },

  { prefix: "/media", permission: "media.view" },

  { path: "/users/new", permission: "users.create" },
  { pattern: /^\/users\/[^/]+\/edit$/, permission: "users.edit" },
  { prefix: "/users", permission: "users.view" },

  // Other settings pages are gated per page through the sidebar (Settings
  // is a group menu: /settings/store needs settings-store.view).
  { prefix: "/settings/admin-roles", permission: "users.manage_roles" },
];

function matchesPrefix(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function matchesRule(pathname, rule) {
  if (rule.path) return pathname === rule.path;
  if (rule.prefix) return matchesPrefix(pathname, rule.prefix);
  return rule.pattern.test(pathname);
}

let cachedNavIndex;

// Returns the required permission key, or null when a session is enough.
export function requiredPermissionForPath(pathname, navItems) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (OPEN_PATHS.some((open) => matchesPrefix(path, open))) return null;

  const rule = ROUTE_RULES.find((candidate) => matchesRule(path, candidate));
  if (rule) return rule.permission;

  const navIndex = navItems
    ? buildNavModuleIndex(navItems)
    : (cachedNavIndex ??= buildNavModuleIndex(adminPanelConfig.navItems));
  const match = navIndex
    .filter((entry) => entry.href !== "/" && matchesPrefix(path, entry.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (match) return `${match.moduleKey}.view`;

  const settingsPage = path.match(/^\/settings\/([^/]+)/);
  return settingsPage ? settingsPermission(settingsPage[1], "view") : null;
}

export function canAccessPath(role, pathname) {
  const permission = requiredPermissionForPath(pathname);
  return !permission || roleHasPermission(role, permission);
}

/**
 * The sidebar a role should see: links it can't open are removed, submenus
 * with no remaining links disappear, and section labels with nothing under
 * them are dropped. Placeholder "#" links follow their menu's module.
 */
export function filterNavItemsForRole(navItems, role) {
  const visible = (href, moduleKey) => {
    if (href && href !== "#") return canAccessPath(role, href);
    return !moduleKey || roleHasPermission(role, `${moduleKey}.view`);
  };

  const filtered = [];
  for (const item of navItems) {
    if (item.type === "section") {
      filtered.push(item);
    } else if (item.type === "submenu") {
      const items = item.items.filter((child) => visible(child.href, navChildModuleKey(item, child)));
      if (items.length) filtered.push({ ...item, items });
    } else if (visible(item.href, navItemModuleKey(item, true))) {
      filtered.push(item);
    }
  }

  // Drop section labels that no longer head any item.
  return filtered.filter(
    (item, i) => item.type !== "section" || (filtered[i + 1] && filtered[i + 1].type !== "section")
  );
}
