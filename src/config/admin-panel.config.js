/**
 * Shop My Band admin panel configuration.
 *
 * This is the ONE file a new project needs to replace to reuse the whole
 * src/components/admin-panel folder: brand, nav menu, header search fields,
 * notifications and the logged-in user. Nothing in the admin-panel components
 * is hard-coded to this store.
 *
 * Roles & Permissions reads `navItems` too: every top-level menu becomes a
 * module in Settings -> Admin & Roles' permission matrix automatically. Use a
 * nav item's optional `permissions` field to map it onto known modules, give
 * it custom actions, or opt out — see src/lib/permissions.js.
 */
export const adminPanelConfig = {
  brand: {
    name: "Shop My Band",
    subtitle: "Admin Panel",
    icon: "gift",
    href: "/admin",
  },

  navItems: [
    { type: "link", id: "dashboard", label: "Dashboard", icon: "grid", href: "/admin" },
    {
      type: "submenu",
      id: "account",
      label: "My Account",
      icon: "user",
      // Personal profile pages — every staff member manages their own.
      permissions: false,
      items: [
        { id: "profile", label: "Profile", href: "/admin/profile" },
        { id: "address", label: "Address", href: "/admin/address" },
        { id: "payment", label: "Payment", href: "/admin/payment" },
      ],
    },
    {
      type: "submenu",
      id: "users",
      label: "Users",
      icon: "users",
      // Staff accounts (the `users` table), gated by the users.* permissions.
      permissions: "users",
      items: [
        { id: "all-users", label: "All Users", href: "/admin/users" },
        { id: "add-user", label: "Add User", href: "/admin/users/new" },
      ],
    },
    {
      type: "submenu",
      id: "orders",
      label: "Orders",
      icon: "shopping-bag",
      items: [
        { id: "all-orders", label: "All Orders", href: "/admin/orders" },
        { id: "pending", label: "Pending", href: "/admin/orders/pending" },
        { id: "processing", label: "Processing", href: "/admin/orders/processing" },
        { id: "completed", label: "Completed", href: "/admin/orders/completed" },
        { id: "cancelled", label: "Cancelled", href: "/admin/orders/cancelled" },
      ],
    },
    {
      type: "submenu",
      id: "customers",
      label: "Customers",
      icon: "users",
      items: [
        { id: "all-customers", label: "All Customers", href: "/admin/all-customers" },
        { id: "add-customer", label: "Add Customer", href: "/admin/add-customer" },
      ],
    },
    {
      type: "submenu",
      id: "catalog",
      label: "Categories / Products",
      icon: "layers",
      // Two modules under one menu: each page names the module it belongs to.
      permissions: { children: true },
      items: [
        { id: "categories", label: "Categories", href: "/admin/categories", permissions: "categories" },
        { id: "all-products", label: "All Products", href: "/admin/all-products", permissions: "products" },
        { id: "add-product", label: "Add Product", href: "/admin/add-product", permissions: "products" },
        { id: "import-products", label: "Import Products", href: "/admin/all-products/import", permissions: "products" },
      ],
    },
    {
      type: "submenu",
      id: "coupons",
      label: "Vouchers / Coupons",
      icon: "tag",
      items: [
        { id: "all-coupons", label: "All Coupons", href: "/admin/all-coupons" },
        { id: "create-coupon", label: "Create Coupon", href: "/admin/create-coupon" },
      ],
    },
    {
      type: "submenu",
      id: "reviews",
      label: "Product Reviews",
      icon: "star",
      items: [
        { id: "all-reviews", label: "All Reviews", href: "/admin/all-reviews" },
        { id: "add-review", label: "Add Review", href: "/admin/add-review" },
      ],
    },
    { type: "link", id: "media", label: "Media", icon: "image", href: "/admin/media" },
    { type: "link", id: "reports", label: "Reports", icon: "bar-chart-2", href: "/admin/reports" },
    {
      type: "link",
      id: "shipping",
      label: "Shipping & Return Policy",
      icon: "truck",
      href: "#",
      permissions: { key: "shipping", label: "Shipping & Return Policy", actions: ["view", "edit"] },
    },
    { type: "section", label: "System" },
    {
      type: "submenu",
      id: "settings",
      label: "Settings",
      icon: "settings",
      // Group menu: every settings page is its own permission row
      // ("settings-<page id>", View / Edit), including pages added here later.
      permissions: { children: true, actions: ["view", "edit"] },
      items: [
        { id: "general", label: "General", href: "/admin/settings/general" },
        { id: "store", label: "Store", href: "/admin/settings/store" },
        { id: "currency-tax", label: "Currency & Tax", href: "/admin/settings/currency-tax" },
        { id: "payment", label: "Payment", href: "/admin/settings/payment" },
        { id: "shipping", label: "Shipping", href: "/admin/settings/shipping" },
        { id: "orders", label: "Orders", href: "/admin/settings/orders" },
        { id: "customers", label: "Customers", href: "/admin/settings/customers" },
        { id: "products", label: "Products", href: "/admin/settings/products" },
        { id: "pricing", label: "Pricing", href: "/admin/settings/pricing" },
        { id: "inventory", label: "Inventory", href: "/admin/settings/inventory" },
        { id: "checkout", label: "Checkout", href: "/admin/settings/checkout" },
        { id: "returns-refunds", label: "Returns & Refunds", href: "/admin/settings/returns-refunds" },
        { id: "discounts-coupons", label: "Discounts & Coupons", href: "/admin/settings/discounts-coupons" },
        { id: "email", label: "Email", href: "/admin/settings/email" },
        { id: "notifications", label: "Notifications", href: "/admin/settings/notifications" },
        { id: "seo", label: "SEO", href: "/admin/settings/seo" },
        { id: "security", label: "Security", href: "/admin/settings/security" },
        { id: "admin-roles", label: "Admin & Roles", href: "/admin/settings/admin-roles", permissions: "users" },
        { id: "integrations", label: "Integrations", href: "/admin/settings/integrations" },
        { id: "social-media", label: "Social Media", href: "/admin/settings/social-media" },
        { id: "legal", label: "Legal", href: "/admin/settings/legal" },
        { id: "system-maintenance", label: "System & Maintenance", href: "/admin/settings/system-maintenance" },
      ],
    },
  ],

  searchFields: [
    { id: "orders", type: "orders", placeholder: "Search orders…", endpoint: "/api/orders", viewAllHref: "/admin/orders" },
    {
      id: "products",
      type: "products",
      placeholder: "Search products…",
      endpoint: "/api/products",
      viewAllHref: "/admin/all-products",
    },
  ],

  // Truthy => the topbar shows the live notification bell (data comes from /api/notifications).
  notifications: {
    viewAllHref: "/admin/notifications",
  },

  user: {
    name: "Haresh",
    role: "Store Admin",
    initials: "HA",
    logoutHref: "/admin/logout",
    menu: [
      { icon: "user", label: "My Profile", href: "/admin/profile" },
      { icon: "settings", label: "Account Settings", href: "/admin/profile#preferences" },
      { icon: "shield", label: "Security", href: "/admin/profile#password" },
    ],
  },

  footer: {
    companyName: "Shop My Band",
    links: [],
  },
};
