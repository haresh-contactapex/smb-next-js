export const NOTIF_COLOR_CLASSES = {
  success: "bg-success/10 text-success",
  error: "bg-error/10 text-error",
  info: "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning",
};

export const ENTITY_ICONS = {
  auth: "lock",
  user: "users",
  role: "shield",
  product: "package",
  category: "layers",
  order: "shopping-bag",
  customer: "user",
  coupon: "tag",
  review: "star",
  media: "image",
  content: "file-text",
  settings: "settings",
  system: "alert-triangle",
};

export const ENTITY_LABELS = {
  auth: "Sign-in",
  user: "Users",
  role: "Roles & permissions",
  product: "Products",
  category: "Categories",
  order: "Orders",
  customer: "Customers",
  coupon: "Coupons",
  review: "Reviews",
  media: "Media",
  content: "CMS pages",
  settings: "Settings",
  system: "System",
};

export const SEVERITY_LABELS = { info: "Info", success: "Success", warning: "Warning", error: "Error" };

export const CHANGED_EVENT = "smb-notifications-changed";
export const RECEIVED_EVENT = "smb-notification-received";

export function badgeText(count) {
  return count > 99 ? "99+" : String(count);
}

export function timeAgo(iso) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return days < 30 ? `${days} day${days === 1 ? "" : "s"} ago` : new Date(iso).toLocaleDateString();
}

// Where clicking a notification goes; the destination page still enforces
// its own permission, so a link is never an access grant.
export function notificationHref(n) {
  if (!n.entityId || n.action.endsWith(".deleted")) return null;
  const id = encodeURIComponent(n.entityId);
  switch (n.entityType) {
    case "order":
      return `/admin/edit-order/${id}`;
    case "product":
      return `/admin/edit-product/${id}`;
    case "customer":
      return `/admin/edit-customer/${id}`;
    case "category":
      return `/admin/edit-category/${id}`;
    case "coupon":
      return `/admin/edit-coupon/${id}`;
    case "review":
      return `/admin/edit-review/${id}`;
    case "content":
      return `/admin/cms/${id}/edit`;
    case "user":
      return `/admin/users/${id}/edit`;
    case "role":
      return "/admin/settings/admin-roles";
    case "settings":
      return `/admin/settings/${id}`;
    default:
      return null;
  }
}

export async function api(path, options) {
  const response = await fetch(path, { credentials: "same-origin", ...options });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) throw new Error(body?.error || "Request failed.");
  return body.data;
}

export function notifyChanged() {
  window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
}
