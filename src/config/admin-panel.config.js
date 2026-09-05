/**
 * Shop My Band admin panel configuration.
 *
 * This is the ONE file a new project needs to replace to reuse the whole
 * src/components/admin-panel folder: brand, nav menu, header search fields,
 * notifications and the logged-in user. Nothing in the admin-panel components
 * is hard-coded to this store.
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
      items: [
        { id: "profile", label: "Profile", href: "/profile" },
        { id: "address", label: "Address", href: "/address" },
        { id: "payment", label: "Payment", href: "/payment" },
        { id: "gift-cards", label: "Gift Cards", href: "/gift-cards" },
      ],
    },
    {
      type: "submenu",
      id: "orders",
      label: "Orders",
      icon: "shopping-bag",
      items: [
        { id: "all-orders", label: "All Orders", href: "#" },
        { id: "pending", label: "Pending", href: "#" },
        { id: "processing", label: "Processing", href: "#" },
        { id: "completed", label: "Completed", href: "#" },
        { id: "cancelled", label: "Cancelled", href: "#" },
      ],
    },
    {
      type: "submenu",
      id: "catalog",
      label: "Categories / Products",
      icon: "layers",
      items: [
        { id: "categories", label: "Categories", href: "/categories" },
        { id: "all-products", label: "All Products", href: "/all-products" },
        { id: "add-product", label: "Add Product", href: "/add-product" },
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
      items: [
        { id: "all-giftcards", label: "All Gift Cards", href: "#" },
        { id: "create-giftcard", label: "Create Gift Card", href: "#" },
        { id: "giftcard-transactions", label: "Gift Card Transactions", href: "#" },
      ],
    },
    { type: "link", id: "shipping", label: "Shipping & Return Policy", icon: "truck", href: "#" },
    { type: "section", label: "System" },
    {
      type: "submenu",
      id: "settings",
      label: "Settings",
      icon: "settings",
      items: [
        { id: "general", label: "General", href: "/settings/general" },
        { id: "store", label: "Store", href: "/settings/store" },
        { id: "currency-tax", label: "Currency & Tax", href: "/settings/currency-tax" },
        { id: "payment", label: "Payment", href: "/settings/payment" },
        { id: "shipping", label: "Shipping", href: "/settings/shipping" },
        { id: "orders", label: "Orders", href: "/settings/orders" },
        { id: "customers", label: "Customers", href: "/settings/customers" },
        { id: "products", label: "Products", href: "/settings/products" },
        { id: "inventory", label: "Inventory", href: "/settings/inventory" },
        { id: "checkout", label: "Checkout", href: "/settings/checkout" },
        { id: "returns-refunds", label: "Returns & Refunds", href: "/settings/returns-refunds" },
        { id: "discounts-coupons", label: "Discounts & Coupons", href: "/settings/discounts-coupons" },
        { id: "email", label: "Email", href: "/settings/email" },
        { id: "notifications", label: "Notifications", href: "/settings/notifications" },
        { id: "seo", label: "SEO", href: "/settings/seo" },
        { id: "security", label: "Security", href: "/settings/security" },
        { id: "admin-roles", label: "Admin & Roles", href: "/settings/admin-roles" },
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
    logoutHref: "/login",
    menu: [
      { icon: "user", label: "My Profile", href: "#" },
      { icon: "settings", label: "Account Settings", href: "#" },
      { icon: "shield", label: "Security", href: "#" },
    ],
  },

  footer: {
    companyName: "Shop My Band",
    links: [],
  },
};
