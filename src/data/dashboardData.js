/**
 * Sample dashboard data, ported from legacy-static/index.html + script.js.
 * In a real project this would come from an API — kept as static data here so the
 * dashboard page (src/app/page.js) has something to render out of the box.
 */

export const storeSetupSteps = {
  completedCount: 4,
  totalCount: 5,
  percent: 80,
  steps: [
    { label: "Store Profile", status: "done" },
    { label: "Payment Connected", status: "done" },
    { label: "First Product Added", status: "done" },
    { label: "Shipping Policy", status: "done" },
    { label: "Publish Store", status: "warning" },
  ],
};

export const dateRangeOptions = ["Today", "Last 7 Days", "Last 30 Days", "Custom Range…"];

export const orderStats = [
  { icon: "shopping-bag", iconColor: "primary", value: "1,248", label: "Total Orders", trend: "up", change: "12.4%" },
  { icon: "clock", iconColor: "warning", value: "64", label: "Pending Orders", trend: "down", change: "3.1%" },
  { icon: "refresh-cw", iconColor: "info", value: "132", label: "Processing", trend: "up", change: "8.7%" },
  { icon: "check-circle", iconColor: "success", value: "1,018", label: "Completed", trend: "up", change: "15.2%" },
  { icon: "x-circle", iconColor: "error", value: "34", label: "Cancelled", trend: "down", change: "1.8%" },
];

export const totalSales = { value: "₹18,42,600", label: "Total Sales", trend: "up", change: "18.9%" };

export const productStats = [
  { icon: "package", iconColor: "primary", value: "386", label: "Total Products" },
  { icon: "check-circle", iconColor: "success", value: "352", label: "Active Products" },
  { icon: "x-circle", iconColor: "error", value: "9", label: "Out of Stock" },
  { icon: "alert-triangle", iconColor: "warning", value: "25", label: "Low Stock" },
];

export const couponGiftCardStats = [
  { icon: "tag", iconColor: "accent", value: "42", label: "Total Coupons" },
  { icon: "check-circle", iconColor: "success", value: "27", label: "Active Coupons" },
  { icon: "gift", iconColor: "info", value: "118", label: "Total Gift Cards" },
  { icon: "dollar-sign", iconColor: "primary", value: "₹4,86,200", label: "Gift Card Value" },
];

export const salesChartData = {
  daily: {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    sales: [42000, 38500, 51200, 47800, 62400, 71500, 58900],
    orders: [18, 15, 22, 20, 27, 31, 25],
  },
  weekly: {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    sales: [286000, 312500, 298700, 344200],
    orders: [124, 138, 130, 152],
  },
  monthly: {
    labels: ["Mar", "Apr", "May", "Jun", "Jul", "Aug"],
    sales: [980000, 1120000, 1045000, 1260000, 1380000, 1842600],
    orders: [412, 468, 440, 512, 561, 620],
  },
};

export const recentOrders = [
  {
    id: "#SMB-10482",
    customer: "Priya Nair",
    initials: "PN",
    avatarColor: "primary",
    date: "Aug 26, 2026",
    products: "2 items",
    amount: "₹42,500",
    payment: "Paid",
    paymentColor: "success",
    status: "Processing",
    statusColor: "info",
  },
  {
    id: "#SMB-10481",
    customer: "Rohan Kulkarni",
    initials: "RK",
    avatarColor: "accent",
    date: "Aug 25, 2026",
    products: "1 item",
    amount: "₹28,900",
    payment: "Paid",
    paymentColor: "success",
    status: "Completed",
    statusColor: "success",
  },
  {
    id: "#SMB-10480",
    customer: "Ananya Shah",
    initials: "AS",
    avatarColor: "info",
    date: "Aug 25, 2026",
    products: "3 items",
    amount: "₹67,200",
    payment: "Unpaid",
    paymentColor: "warning",
    status: "Pending",
    statusColor: "warning",
  },
  {
    id: "#SMB-10479",
    customer: "Vikram Mehta",
    initials: "VM",
    avatarColor: "success",
    date: "Aug 24, 2026",
    products: "1 item",
    amount: "₹1,12,400",
    payment: "Paid",
    paymentColor: "success",
    status: "Completed",
    statusColor: "success",
  },
  {
    id: "#SMB-10478",
    customer: "Sonal Desai",
    initials: "SD",
    avatarColor: "error",
    date: "Aug 23, 2026",
    products: "2 items",
    amount: "₹35,750",
    payment: "Refunded",
    paymentColor: "info",
    status: "Cancelled",
    statusColor: "error",
  },
];

export const productPerformance = [
  {
    name: "Rose Gold Eternity Band",
    category: "Wedding Bands",
    unitsSold: 142,
    revenue: "₹6,03,800",
    stock: "0 units",
    stockLevel: "out",
    status: "Out of Stock",
    statusColor: "error",
    iconColor: "accent",
  },
  {
    name: "Classic Platinum Band",
    category: "Wedding Bands",
    unitsSold: 98,
    revenue: "₹8,82,000",
    stock: "64 units",
    stockLevel: "ok",
    status: "Active",
    statusColor: "success",
    iconColor: "primary",
  },
  {
    name: "Diamond Pave Band",
    category: "Diamond Rings",
    unitsSold: 76,
    revenue: "₹11,40,000",
    stock: "6 units",
    stockLevel: "low",
    status: "Low Stock",
    statusColor: "warning",
    iconColor: "success",
  },
  {
    name: "Brushed Titanium Band",
    category: "Men's Bands",
    unitsSold: 61,
    revenue: "₹2,44,000",
    stock: "122 units",
    stockLevel: "ok",
    status: "Active",
    statusColor: "success",
    iconColor: "info",
  },
];

export const quickActions = [
  { icon: "plus-circle", iconColor: "primary", label: "Add Product", href: "#" },
  { icon: "tag", iconColor: "accent", label: "Create Coupon", href: "#" },
  { icon: "gift", iconColor: "info", label: "Create Gift Card", href: "#" },
  { icon: "shopping-bag", iconColor: "success", label: "View Orders", href: "/orders" },
  { icon: "settings", iconColor: "warning", label: "Update Store Settings", href: "#", wide: true },
];

export const recentActivity = [
  { icon: "shopping-bag", iconColor: "success", text: "New order received from Priya Nair", time: "2 minutes ago" },
  { icon: "alert-triangle", iconColor: "error", text: '"Rose Gold Eternity Band" went out of stock', time: "28 minutes ago" },
  { icon: "tag", iconColor: "accent", text: 'Coupon "WED26" created', time: "1 hour ago" },
  { icon: "gift", iconColor: "info", text: "Gift card GC-2291 redeemed", time: "2 hours ago" },
  { icon: "dollar-sign", iconColor: "primary", text: "Payment received for order #SMB-10479", time: "3 hours ago" },
  { icon: "user", iconColor: "neutral", text: "Vendor profile updated", time: "Yesterday, 6:42 PM" },
];
