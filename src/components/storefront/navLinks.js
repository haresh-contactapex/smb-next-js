// Mega menu opened from the "Wedding Bands" link: two columns of items, and a
// preview panel that follows whichever item is hovered. Each item is a category:
// it opens that category's storefront page (/collections/<slug>) and its preview
// shows a product photo from the same category. `slug` is the category's slug in
// the admin, so renaming it there breaks both. The description under each item
// isn't kept here: the header loads it from the category (see
// `withMenuDescriptions`), so it always matches the text at the top of the page.
// It is a short version unless the menu sets `fullDescriptions`.
const collection = (slug) => `/collections/${slug}`;

const menuItem = (label, slug, icon) => ({ label, description: "", slug, href: collection(slug), icon });

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

// Smaller menus: one item per column. Their items fill the whole column, so they
// have room to show each category's full description.
export const ANNIVERSARY_BANDS_MENU = {
  fullDescriptions: true,
  columns: [
    [menuItem("Women's Anniversary Bands", "women-s-anniversary-bands", "women")],
    [menuItem("Men's Anniversary Bands", "men-s-anniversary-bands", "men")],
  ],
};

export const CLASSIC_BANDS_MENU = {
  fullDescriptions: true,
  columns: [
    [menuItem("Women's Classic Bands", "women-s-classic-wedding-bands", "women")],
    [menuItem("Men's Classic Bands", "men-s-classic-wedding-bands", "men")],
  ],
};

// Storefront nav links. A link with a `megaMenu` opens it on hover in the desktop
// header, and the mobile drawer lists its items under the link. "Wedding Bands",
// "Anniversary Bands" and "Classic Bands" each open a landing page, a CMS page at
// /wedding-band, /anniversary-bands and /classic-bands (seeded from
// scripts/cms-content/<slug>.html).
export const WEDDING_BANDS_PAGE_HREF = "/wedding-band";
export const ANNIVERSARY_BANDS_PAGE_HREF = "/anniversary-bands";
export const CLASSIC_BANDS_PAGE_HREF = "/classic-bands";

export const STORE_NAV_LINKS = [
  { label: "Wedding Bands", href: WEDDING_BANDS_PAGE_HREF, megaMenu: WEDDING_BANDS_MENU },
  { label: "Anniversary Bands", href: ANNIVERSARY_BANDS_PAGE_HREF, megaMenu: ANNIVERSARY_BANDS_MENU },
  { label: "Classic Bands", href: CLASSIC_BANDS_PAGE_HREF, megaMenu: CLASSIC_BANDS_MENU },
  { label: "Eternity Bands", href: collection("eternity-bands") },
  { label: "New Arrivals", href: collection("new-arrivals") },
];

// Every category slug used by a mega menu item, for loading their descriptions.
export const STORE_MENU_SLUGS = STORE_NAV_LINKS.flatMap((link) => (link.megaMenu ? link.megaMenu.columns.flat().map((item) => item.slug) : []));

// A copy of the nav links with each mega menu item's description filled in from
// `descriptions` ({ [slug]: { short, full } }): the full text for a menu that sets
// `fullDescriptions`, the short text otherwise. An item without one keeps none.
export function withMenuDescriptions(links, descriptions) {
  return links.map((link) => {
    if (!link.megaMenu) return link;
    const { fullDescriptions } = link.megaMenu;
    const describe = (item) => (fullDescriptions ? descriptions[item.slug]?.full : descriptions[item.slug]?.short) || "";
    return {
      ...link,
      megaMenu: {
        ...link.megaMenu,
        columns: link.megaMenu.columns.map((column) => column.map((item) => ({ ...item, description: describe(item) }))),
      },
    };
  });
}

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

// The two copyright lines under the footer: the sister site and the web developer, each linked.
export const STORE_PARENT_SITE = { label: "MyBridalRing.com", href: "https://www.mybridalring.com" };
export const STORE_DEVELOPER = { label: "Los Angeles Web Development", href: "https://www.apexglobalsolutions.com/" };

// City landing pages (CMS pages at /<slug>), linked in a row under the footer blurb.
export const STORE_FOOTER_CITIES = [
  { label: "Los Angeles", slug: "los-angeles" },
  { label: "New York", slug: "new-york" },
  { label: "Atlanta", slug: "atlanta" },
  { label: "Chicago", slug: "chicago" },
  { label: "Texas", slug: "texas" },
  { label: "Seattle", slug: "seattle" },
  { label: "San Francisco", slug: "san-francisco" },
  { label: "Denver", slug: "denver" },
  { label: "Austin", slug: "austin" },
  { label: "Arizona", slug: "arizona" },
  { label: "Portland", slug: "portland" },
];

// Footer social icons: white masks of the SVGs in public/storefront/contact/icons.
export const STORE_SOCIAL_LINKS = [
  { label: "Facebook", href: "https://www.facebook.com/shopmyband/", icon: "/storefront/contact/icons/facebook.svg" },
  { label: "X", href: "https://x.com/ShopMyBand", icon: "/storefront/contact/icons/x.svg" },
  { label: "Instagram", href: "https://www.instagram.com/shopmyband/", icon: "/storefront/contact/icons/instagram.svg" },
  { label: "Pinterest", href: "https://www.pinterest.com/shopmyband/", icon: "/storefront/contact/icons/pinterest.svg" },
];
