const AVATAR_COLORS = ["primary", "accent", "success", "info", "error"];

export function pickAvatarColor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function getInitials(firstName, lastName) {
  const initials = `${(firstName || "").trim().charAt(0)}${(lastName || "").trim().charAt(0)}`;
  return initials.toUpperCase() || "?";
}

export function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export const GROUP_LABELS = {
  Retail: "Retail",
  Wholesale: "Wholesale",
  VIP: "VIP",
};

export const GROUP_BADGE_CLASSES = {
  Retail: "bg-info/10 text-info",
  Wholesale: "bg-accent-500/10 text-accent-600 dark:text-accent-400",
  VIP: "bg-warning/10 text-warning",
};

export const TYPE_LABELS = {
  registered: "Registered",
  guest: "Guest",
};

export function computeCustomerStats(customers) {
  return {
    total: customers.length,
    registered: customers.filter((c) => !c.isGuest).length,
    guest: customers.filter((c) => c.isGuest).length,
    marketingOptIn: customers.filter((c) => c.acceptsMarketing).length,
  };
}
