// Mega menu opened from the "Wedding Bands" link: two columns of items, and a
// preview panel that follows whichever item is hovered. Category pages don't
// exist yet, so every item points at the full product listing for now.
const MENU_DESCRIPTION = "Lorem Ipsum is simply dummy text of the printing and typesetting industry.";

export const WEDDING_BANDS_MENU = {
  columns: [
    [
      { label: "Women's Wedding Bands", description: MENU_DESCRIPTION, href: "/women-wedding-bands", icon: "women" },
      { label: "Men's Wedding Bands", description: MENU_DESCRIPTION, href: "/women-wedding-bands", icon: "men" },
      { label: "Contemporary Metal Bands", description: MENU_DESCRIPTION, href: "/women-wedding-bands", icon: "contemporary" },
    ],
    [
      { label: "Lab Grown Diamond Bands", description: MENU_DESCRIPTION, href: "/women-wedding-bands", icon: "labDiamond" },
      { label: "Curved Wedding Bands", description: MENU_DESCRIPTION, href: "/women-wedding-bands", icon: "curved" },
      { label: "Thin Wedding Bands", description: MENU_DESCRIPTION, href: "/women-wedding-bands", icon: "thin" },
    ],
  ],
};

// Smaller menus: one item per column. `imageOffset` is where in the shared list
// of preview photos the menu starts (the Wedding Bands menu uses the first six),
// so each menu shows different products.
export const ANNIVERSARY_BANDS_MENU = {
  imageOffset: 6,
  columns: [
    [{ label: "Women's Anniversary Bands", description: MENU_DESCRIPTION, href: "/women-wedding-bands", icon: "women" }],
    [{ label: "Men's Anniversary Bands", description: MENU_DESCRIPTION, href: "/women-wedding-bands", icon: "men" }],
  ],
};

export const CLASSIC_BANDS_MENU = {
  imageOffset: 8,
  columns: [
    [{ label: "Women's Classic Bands", description: MENU_DESCRIPTION, href: "/women-wedding-bands", icon: "women" }],
    [{ label: "Men's Classic Bands", description: MENU_DESCRIPTION, href: "/women-wedding-bands", icon: "men" }],
  ],
};

// Storefront category links. Category pages don't exist yet, so they all
// point at the full product listing for now. A link with a `megaMenu` opens it
// on hover (desktop header only; the mobile drawer lists plain links).
export const STORE_NAV_LINKS = [
  { label: "Wedding Bands", href: "/women-wedding-bands", megaMenu: WEDDING_BANDS_MENU },
  { label: "Anniversary Bands", href: "/women-wedding-bands", megaMenu: ANNIVERSARY_BANDS_MENU },
  { label: "Classic Bands", href: "/women-wedding-bands", megaMenu: CLASSIC_BANDS_MENU },
  { label: "Eternity Bands", href: "/women-wedding-bands" },
  { label: "New Arrivals", href: "/women-wedding-bands" },
];

// Messages shown in the blue bar above the storefront header.
export const STORE_ANNOUNCEMENTS = [
  "Free shipping to US",
  "30-Day Return Policy",
  "Free Lifetime Cleaning & Inspection",
];

export const STORE_FOOTER_LINES = [
  "© 2026 ShopMyBand.com, a division of MyBridalRing.com. All rights reserved.",
  "Los Angeles Web Development by Apex Global Solutions",
];
