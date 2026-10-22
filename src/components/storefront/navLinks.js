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

export const STORE_FOOTER_LINES = [
  "© 2026 ShopMyBand.com, a division of MyBridalRing.com. All rights reserved.",
  "Los Angeles Web Development by Apex Global Solutions",
];

// Footer text of the main category pages, by page path. Any other page shows STORE_FOOTER_BLURB.
export const STORE_FOOTER_BLURB_BY_PATH = {
  [WEDDING_BANDS_PAGE_HREF]: [
    "Wedding bands symbolize love and commitment, suited to personal style and preference. From dazzling diamond wedding bands for that extra sparkle to unique men's wedding bands designed with modernity and elegance, and metal bands, there's an array of options to explore. The choice of metal for a wedding band is pivotal; precious yellow gold, feminine rose gold, contemporary white gold, or durable platinum provide a range of aesthetics. For women, the beauty of women's wedding bands is in their delicate and stylish designs. Comfort fit wedding bands are perfect for those seeking both individuality and ease in wear, symbolizing love sustainably.",
  ],
  [ANNIVERSARY_BANDS_PAGE_HREF]: [
    "Celebrate your enduring love with our stunning wedding anniversary bands. Offer her an elegant and unique diamond anniversary band to symbolize your treasured years together. Whether it's a shimmering white gold anniversary band, a romantic rose gold band, a classic yellow gold band, or a timeless platinum anniversary band, each piece is a poignant reminder of your shared journey. These exquisite bands offer a captivating blend of style and sentiment that truly represent the everlasting bond between two souls.",
  ],
  [CLASSIC_BANDS_PAGE_HREF]: [
    "When it comes to classic bands, there is something timeless about their elegance. Classic wedding bands have long been a symbol of love and commitment between couples. For grooms, classic mens wedding bands perfectly balance style and simplicity, while a gold wedding band adds a touch of sophistication. Many grooms prefer a band that complements their style. Brides can choose from various classic women’s wedding bands in a plethora of designs to match any personality.",
  ],
  [collection("eternity-bands")]: [
    "Eternity bands come in a variety of styles and metals. The white gold eternity ring is a sought-after option, known for its elegance and timeless appeal. Its sleek design makes it versatile, suitable for both casual and formal occasions. Another popular option is the half eternity band, which provides a more understated yet luxurious look. For those looking for classic wedding bands, diamond eternity wedding bands are a good choice, the channel-set diamond eternity band stands out. Unique diamond eternity bands provide a touch of individuality and personal expression, with unconventional designs and cuts. How you wear your eternity ring is a personal choice. Some couples stack them with a wedding band first, followed by engagement and finally, the eternity ring on the third finger. Whatever your choice, you can get your perfect eternity ring on Shop My Band.",
  ],
  [collection("new-arrivals")]: [
    "Our latest trendy collections include modern, classic wedding bands that are perfect for those looking for traditional yet timeless pieces. Our classic mens' wedding bands offer a sophisticated and masculine touch while classic women's wedding bands are perfect for any bride-to-be. Additionally, our selection of eternity bands including women's eternity bands and diamond eternity bands offer a stunning shine to match any engagement ring. Our white gold mens' wedding bands provide a sleek and modern look for grooms, while our women's wedding bands and gold wedding bands for women add a touch of elegance to any attire. Whether you're looking for a special piece for your big day or a timeless gift for an anniversary, Shop My Band's latest collection of wedding and anniversary jewelry offers something for everyone.",
  ],
};

export const STORE_FOOTER_BLURB = [
  "Shop My Band is a premier online jewelry store that specializes in a wide selection of wedding bands. With a focus on quality and style, we offer a range of options to suit every taste and budget. Whether you're searching for classic diamond wedding bands, unique mens wedding bands, or gold wedding bands for women, Shop My Band has you covered. Our collection includes an array of stunning eternity bands, and more. If you're looking for a touch of luxury, we also offer rose gold wedding bands.",
  "With Shop My Band, you can find the perfect wedding band to celebrate your special day. Our extensive variety, attention to detail, and commitment to customer satisfaction sets us apart as a top choice in online jewelry stores.",
];

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
