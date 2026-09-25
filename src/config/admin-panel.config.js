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
    href: "/",
  },

  navItems: [
    { type: "link", id: "dashboard", label: "Dashboard", icon: "grid", href: "/" },
    {
      type: "submenu",
      id: "account",
      label: "My Account",
      icon: "user",
      // Personal profile pages — every staff member manages their own.
      permissions: false,
      items: [
        { id: "profile", label: "Profile", href: "/profile" },
        { id: "address", label: "Address", href: "/address" },
        { id: "payment", label: "Payment", href: "/payment" },
        { id: "gift-cards", label: "Gift Cards", href: "/gift-cards" },
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
        { id: "all-users", label: "All Users", href: "/users" },
        { id: "add-user", label: "Add User", href: "/users/new" },
      ],
    },
    {
      type: "submenu",
      id: "orders",
      label: "Orders",
      icon: "shopping-bag",
      items: [
        { id: "all-orders", label: "All Orders", href: "/orders" },
        { id: "pending", label: "Pending", href: "/orders/pending" },
        { id: "processing", label: "Processing", href: "/orders/processing" },
        { id: "completed", label: "Completed", href: "/orders/completed" },
        { id: "cancelled", label: "Cancelled", href: "/orders/cancelled" },
      ],
    },
    {
      type: "submenu",
      id: "customers",
      label: "Customers",
      icon: "users",
      items: [
        { id: "all-customers", label: "All Customers", href: "/all-customers" },
        { id: "add-customer", label: "Add Customer", href: "/add-customer" },
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
        { id: "categories", label: "Categories", href: "/categories", permissions: "categories" },
        { id: "all-products", label: "All Products", href: "/all-products", permissions: "products" },
        { id: "add-product", label: "Add Product", href: "/add-product", permissions: "products" },
        { id: "import-products", label: "Import Products", href: "/all-products/import", permissions: "products" },
      ],
    },
    {
      type: "submenu",
      id: "coupons",
      label: "Vouchers / Coupons",
      icon: "tag",
      items: [
        { id: "all-coupons", label: "All Coupons", href: "/all-coupons" },
        { id: "create-coupon", label: "Create Coupon", href: "/create-coupon" },
      ],
    },
    {
      type: "submenu",
      id: "giftcards",
      label: "Gift Cards",
      icon: "gift",
      permissions: { key: "giftcards", label: "Gift Cards", singular: "Gift Card" },
      items: [
        { id: "all-giftcards", label: "All Gift Cards", href: "#" },
        { id: "create-giftcard", label: "Create Gift Card", href: "#" },
        { id: "giftcard-transactions", label: "Gift Card Transactions", href: "#" },
      ],
    },
    { type: "link", id: "media", label: "Media", icon: "image", href: "/media" },
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
        { id: "general", label: "General", href: "/settings/general" },
        { id: "store", label: "Store", href: "/settings/store" },
        { id: "currency-tax", label: "Currency & Tax", href: "/settings/currency-tax" },
        { id: "payment", label: "Payment", href: "/settings/payment" },
        { id: "shipping", label: "Shipping", href: "/settings/shipping" },
        { id: "orders", label: "Orders", href: "/settings/orders" },
        { id: "customers", label: "Customers", href: "/settings/customers" },
        { id: "products", label: "Products", href: "/settings/products" },
        { id: "pricing", label: "Pricing", href: "/settings/pricing" },
        { id: "inventory", label: "Inventory", href: "/settings/inventory" },
        { id: "checkout", label: "Checkout", href: "/settings/checkout" },
        { id: "returns-refunds", label: "Returns & Refunds", href: "/settings/returns-refunds" },
        { id: "discounts-coupons", label: "Discounts & Coupons", href: "/settings/discounts-coupons" },
        { id: "email", label: "Email", href: "/settings/email" },
        { id: "notifications", label: "Notifications", href: "/settings/notifications" },
        { id: "seo", label: "SEO", href: "/settings/seo" },
        { id: "security", label: "Security", href: "/settings/security" },
        { id: "admin-roles", label: "Admin & Roles", href: "/settings/admin-roles", permissions: "users" },
        { id: "integrations", label: "Integrations", href: "/settings/integrations" },
        { id: "social-media", label: "Social Media", href: "/settings/social-media" },
        { id: "legal", label: "Legal", href: "/settings/legal" },
        { id: "system-maintenance", label: "System & Maintenance", href: "/settings/system-maintenance" },
      ],
    },
  ],

  searchFields: [
    { id: "orders", placeholder: "Search orders…" },
    { id: "products", placeholder: "Search products…" },
  ],

  notifications: {
    newCount: 4,
    viewAllHref: "#",
    items: [
      {
        icon: "shopping-bag",
        color: "success",
        title: "New order #SMB-10482 received",
        time: "2 minutes ago",
      },
      {
        icon: "alert-triangle",
        color: "error",
        title: '"Rose Gold Eternity Band" is out of stock',
        time: "28 minutes ago",
      },
      {
        icon: "gift",
        color: "accent",
        title: "Gift card GC-2291 redeemed",
        time: "1 hour ago",
      },
      {
        icon: "dollar-sign",
        color: "info",
        title: "Payment received for order #SMB-10479",
        time: "3 hours ago",
      },
    ],
  },

  user: {
    name: "Haresh",
    role: "Store Admin",
    initials: "HA",
    logoutHref: "/admin/logout",
    menu: [
      { icon: "user", label: "My Profile", href: "/profile" },
      { icon: "settings", label: "Account Settings", href: "/profile#preferences" },
      { icon: "shield", label: "Security", href: "/profile#password" },
    ],
  },

  footer: {
    companyName: "Shop My Band",
    links: [],
  },
};
