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

// Storefront category links. Category pages don't exist yet, so they all
// point at the full product listing for now. A link with a `megaMenu` opens it
// on hover (desktop header only; the mobile drawer lists plain links).
export const STORE_NAV_LINKS = [
  { label: "Wedding Bands", href: "/women-wedding-bands", megaMenu: WEDDING_BANDS_MENU },
  { label: "Anniversary Bands", href: "/women-wedding-bands" },
  { label: "Classic Bands", href: "/women-wedding-bands" },
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
