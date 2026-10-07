// Mega menu opened from the "Wedding Bands" link: two columns of items, and a
// preview panel that follows whichever item is hovered. Each item is a category:
// it opens that category's storefront page (/collections/<slug>) and its preview
// shows a product photo from the same category. `slug` is the category's slug in
// the admin, so renaming it there breaks both.
const collection = (slug) => `/collections/${slug}`;

const MENU_DESCRIPTION = "Lorem Ipsum is simply dummy text of the printing and typesetting industry.";

const menuItem = (label, slug, icon) => ({ label, description: MENU_DESCRIPTION, slug, href: collection(slug), icon });

export const WEDDING_BANDS_MENU = {
  columns: [
    [
      menuItem("Women's Wedding Bands", "women-s-wedding-bands", "women"),
      menuItem("Men's Wedding Bands", "men-s-wedding-bands", "men"),
      menuItem("Contemporary Metal Bands", "contemporary-metal-bands", "contemporary"),
    ],
    [
      menuItem("Lab Grown Diamond Bands", "lab-grown-diamond-wedding-bands", "labDiamond"),
      menuItem("Curved Wedding Bands", "curved-wedding-bands", "curved"),
      menuItem("Thin Wedding Bands", "thin-wedding-bands", "thin"),
    ],
  ],
};

// Smaller menus: one item per column.
export const ANNIVERSARY_BANDS_MENU = {
  columns: [
    [menuItem("Women's Anniversary Bands", "women-s-anniversary-bands", "women")],
    [menuItem("Men's Anniversary Bands", "men-s-anniversary-bands", "men")],
  ],
};

export const CLASSIC_BANDS_MENU = {
  columns: [
    [menuItem("Women's Classic Bands", "women-s-classic-wedding-bands", "women")],
    [menuItem("Men's Classic Bands", "men-s-classic-wedding-bands", "men")],
  ],
};

// Storefront nav links. A link with a `megaMenu` opens it on hover in the desktop
// header, and the mobile drawer lists its items under the link. "Wedding Bands" opens
// the Wedding Band landing page, a CMS page at /wedding-bands (seeded from
// scripts/cms-content/wedding-bands.html). There is no "Anniversary Bands" / "Classic
// Bands" parent page yet, so those two links open the first item of their own menu.
const firstItemHref = (menu) => menu.columns[0][0].href;
export const WEDDING_BANDS_PAGE_HREF = "/wedding-bands";

export const STORE_NAV_LINKS = [
  { label: "Wedding Bands", href: WEDDING_BANDS_PAGE_HREF, megaMenu: WEDDING_BANDS_MENU },
  { label: "Anniversary Bands", href: firstItemHref(ANNIVERSARY_BANDS_MENU), megaMenu: ANNIVERSARY_BANDS_MENU },
  { label: "Classic Bands", href: firstItemHref(CLASSIC_BANDS_MENU), megaMenu: CLASSIC_BANDS_MENU },
  { label: "Eternity Bands", href: collection("eternity-bands") },
  { label: "New Arrivals", href: collection("new-arrivals") },
];

// True when `pathname` is the page `href` points at (a trailing slash doesn't matter).
export function isCurrentPath(pathname, href) {
  const clean = (path) => (path.length > 1 ? path.replace(/\/+$/, "") : path);
  return clean(pathname || "") === clean(href);
}

// A nav link is current on its own page and, for one with a mega menu, on any of
// that menu's pages, so "Wedding Bands" stays lit while you browse "Thin Wedding Bands".
export function isCurrentLink(link, pathname) {
  if (isCurrentPath(pathname, link.href)) return true;
  return Boolean(link.megaMenu?.columns.flat().some((item) => isCurrentPath(pathname, item.href)));
}

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
