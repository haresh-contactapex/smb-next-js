// Pure display helpers shared by the account pages. Nothing here touches the DOM
// or the network, so it is safe to call from server and client components.

// The sections of the account area, in sidebar order. `match` decides which
// pathnames highlight the entry (orders/<number> still belongs to Orders).
export const ACCOUNT_NAV = [
  { id: "overview", label: "Overview", href: "/account", icon: "home", exact: true },
  { id: "orders", label: "Orders", href: "/account/orders", icon: "box" },
  { id: "wishlist", label: "Wishlist", href: "/account/wishlist", icon: "heart" },
  { id: "addresses", label: "Addresses", href: "/account/addresses", icon: "mapPin" },
  { id: "payment-methods", label: "Payment methods", href: "/account/payment-methods", icon: "creditCard" },
  { id: "profile", label: "Profile & security", href: "/account/profile", icon: "user" },
];

export function navItemForPath(pathname) {
  const path = (pathname || "").replace(/\/+$/, "") || "/";
  return ACCOUNT_NAV.find((item) => (item.exact ? path === item.href : path === item.href || path.startsWith(`${item.href}/`)));
}

export function initialsOf(customer) {
  const first = String(customer?.firstName || "").trim()[0] || "";
  const last = String(customer?.lastName || "").trim()[0] || "";
  return (first + last).toUpperCase() || "?";
}

export function fullNameOf(customer) {
  return [customer?.firstName, customer?.lastName].filter(Boolean).join(" ").trim();
}

// Dates are shown in UTC so the server render and the browser agree on the day.
const DATE_FORMAT = { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" };

export function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", DATE_FORMAT);
}

export function formatMonthYear(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

// Badge colors, one entry per status the orders table allows.
const ORDER_STATUS_STYLES = {
  Pending: "bg-amber-50 text-amber-800 ring-amber-200",
  Processing: "bg-blue-50 text-blue-800 ring-blue-200",
  Completed: "bg-green-50 text-green-800 ring-green-200",
  Cancelled: "bg-gray-100 text-gray-600 ring-gray-200",
};

const PAYMENT_STATUS_STYLES = {
  Paid: "bg-green-50 text-green-800 ring-green-200",
  Unpaid: "bg-amber-50 text-amber-800 ring-amber-200",
  Refunded: "bg-blue-50 text-blue-800 ring-blue-200",
  Failed: "bg-red-50 text-red-700 ring-red-200",
};

const NEUTRAL_BADGE = "bg-gray-100 text-gray-600 ring-gray-200";

export const orderStatusStyle = (status) => ORDER_STATUS_STYLES[status] || NEUTRAL_BADGE;
export const paymentStatusStyle = (status) => PAYMENT_STATUS_STYLES[status] || NEUTRAL_BADGE;

// What each order status means to the customer, in a sentence.
export const ORDER_STATUS_HELP = {
  Pending: "We've received your order and will start on it shortly.",
  Processing: "Your order is being prepared.",
  Completed: "Your order is complete.",
  Cancelled: "This order was cancelled.",
};

// The three stages an order moves through, for the progress tracker on the order page.
export const ORDER_STEPS = ["Pending", "Processing", "Completed"];

export const ORDER_STEP_LABELS = { Pending: "Order placed", Processing: "Processing", Completed: "Completed" };

export function orderStepIndex(status) {
  return ORDER_STEPS.indexOf(status);
}

export const PAYMENT_PROVIDER_LABELS = {
  stripe: "Card",
  paypal: "PayPal",
  razorpay: "Razorpay",
  cod: "Cash on delivery",
};

// "115 Foothill Blvd, Apt 4" / "Los Angeles, California 90017" / "United States"
export function addressLines(address) {
  if (!address) return [];
  const region = [address.city, [address.state, address.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return [[address.line1, address.line2].filter(Boolean).join(", "), region, address.country].filter(Boolean);
}

// Customer groups are shown as membership tiers.
export const TIER_LABELS = { Retail: "Member", Wholesale: "Wholesale", VIP: "VIP" };
export const tierLabel = (group) => TIER_LABELS[group] || "Member";

// Link to the orders list with a filter, search and page applied; anything left
// at its default is omitted so the URL stays short.
export function ordersHref({ status, q, page } = {}) {
  const params = new URLSearchParams();
  if (status && status !== "all") params.set("status", status);
  if (q) params.set("q", q);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/account/orders?${query}` : "/account/orders";
}

export const pluralize =(count, singular, plural = `${singular}s`) => `${count} ${count === 1 ? singular : plural}`;
