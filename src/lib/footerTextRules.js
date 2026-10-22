// Rules for the storefront footer text, shared by the admin form and the server
// (so a mistake is caught in the browser and again before anything is saved), plus
// the text the footer shows until staff have saved their own. See docs/cms/cms.md.

// The path of the row that applies to every page without a row of its own.
export const ALL_PAGES_PATH = "*";

export const FOOTER_TEXT_MAX = 5000;
export const FOOTER_TEXT_PATH_MAX = 200;
export const FOOTER_TEXT_ENTRIES_MAX = 100;

const PATH_PATTERN = /^\/([a-z0-9_-]+(\/[a-z0-9_-]+)*)?$/;
export const PATH_HINT = "Enter a page address like /classic-bands or /collections/eternity-bands.";

// "https://shopmyband.com/Classic-Bands/?x=1#top" -> "/classic-bands". Returns the
// address as typed (lowercased) when it isn't a valid page address, so the form can
// show what was rejected; use isValidFooterPath to tell.
export function normalizeFooterPath(value) {
  let path = String(value ?? "").trim().toLowerCase();
  path = path.replace(/^https?:\/\/[^/]+/, "").replace(/[?#].*$/, "");
  if (path && !path.startsWith("/")) path = `/${path}`;
  path = path.replace(/\/+$/, "");
  return path || (String(value ?? "").trim() ? "/" : "");
}

export const isValidFooterPath = (path) => path.length <= FOOTER_TEXT_PATH_MAX && PATH_PATTERN.test(path);

// Paragraphs of a saved text: a blank line starts a new one.
export function footerTextParagraphs(content) {
  return String(content ?? "")
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/**
 * Checks and cleans a list of `{ path, content }` entries. The first entry must be the
 * all-pages text (path "*"); the rest are pages. Returns { entries, errors } where
 * `errors` is { [index]: { path?, content? } } and `entries` is the cleaned list.
 */
export function normalizeFooterTextsInput(input) {
  const errors = {};
  const entries = [];
  const fail = (index, field, message) => {
    errors[index] = { ...errors[index], [field]: message };
  };

  const list = Array.isArray(input) ? input : [];
  if (list.length === 0) return { entries, errors: { 0: { content: "The text for all other pages is required." } } };
  if (list.length > FOOTER_TEXT_ENTRIES_MAX) {
    return { entries, errors: { 0: { content: `Up to ${FOOTER_TEXT_ENTRIES_MAX} pages can have their own footer text.` } } };
  }

  const seen = new Map();
  list.forEach((item, index) => {
    const isAllPages = index === 0;
    const content = String(item?.content ?? "").replace(/\r\n?/g, "\n").trim();
    let path = ALL_PAGES_PATH;

    if (!isAllPages) {
      path = normalizeFooterPath(item?.path);
      if (!path) fail(index, "path", "Enter the page address.");
      else if (!isValidFooterPath(path)) fail(index, "path", PATH_HINT);
      else if (seen.has(path)) fail(index, "path", "Another entry already uses that page address.");
      else seen.set(path, index);
    }

    if (!content) fail(index, "content", isAllPages ? "The text for all other pages is required." : "Enter the footer text for this page.");
    else if (content.length > FOOTER_TEXT_MAX) fail(index, "content", `Keep it to ${FOOTER_TEXT_MAX} characters or fewer.`);

    entries.push({ path, content });
  });

  return { entries, errors };
}

// What the footer shows until staff save their own: the text the store launched with.
export const DEFAULT_FOOTER_TEXTS = [
  {
    path: ALL_PAGES_PATH,
    content: [
      "Shop My Band is a premier online jewelry store that specializes in a wide selection of wedding bands. With a focus on quality and style, we offer a range of options to suit every taste and budget. Whether you're searching for classic diamond wedding bands, unique mens wedding bands, or gold wedding bands for women, Shop My Band has you covered. Our collection includes an array of stunning eternity bands, and more. If you're looking for a touch of luxury, we also offer rose gold wedding bands.",
      "With Shop My Band, you can find the perfect wedding band to celebrate your special day. Our extensive variety, attention to detail, and commitment to customer satisfaction sets us apart as a top choice in online jewelry stores.",
    ].join("\n\n"),
  },
  {
    path: "/anniversary-bands",
    content:
      "Celebrate your enduring love with our stunning wedding anniversary bands. Offer her an elegant and unique diamond anniversary band to symbolize your treasured years together. Whether it's a shimmering white gold anniversary band, a romantic rose gold band, a classic yellow gold band, or a timeless platinum anniversary band, each piece is a poignant reminder of your shared journey. These exquisite bands offer a captivating blend of style and sentiment that truly represent the everlasting bond between two souls.",
  },
  {
    path: "/classic-bands",
    content:
      "When it comes to classic bands, there is something timeless about their elegance. Classic wedding bands have long been a symbol of love and commitment between couples. For grooms, classic mens wedding bands perfectly balance style and simplicity, while a gold wedding band adds a touch of sophistication. Many grooms prefer a band that complements their style. Brides can choose from various classic women’s wedding bands in a plethora of designs to match any personality.",
  },
  {
    path: "/collections/eternity-bands",
    content:
      "Eternity bands come in a variety of styles and metals. The white gold eternity ring is a sought-after option, known for its elegance and timeless appeal. Its sleek design makes it versatile, suitable for both casual and formal occasions. Another popular option is the half eternity band, which provides a more understated yet luxurious look. For those looking for classic wedding bands, diamond eternity wedding bands are a good choice, the channel-set diamond eternity band stands out. Unique diamond eternity bands provide a touch of individuality and personal expression, with unconventional designs and cuts. How you wear your eternity ring is a personal choice. Some couples stack them with a wedding band first, followed by engagement and finally, the eternity ring on the third finger. Whatever your choice, you can get your perfect eternity ring on Shop My Band.",
  },
  {
    path: "/collections/new-arrivals",
    content:
      "Our latest trendy collections include modern, classic wedding bands that are perfect for those looking for traditional yet timeless pieces. Our classic mens' wedding bands offer a sophisticated and masculine touch while classic women's wedding bands are perfect for any bride-to-be. Additionally, our selection of eternity bands including women's eternity bands and diamond eternity bands offer a stunning shine to match any engagement ring. Our white gold mens' wedding bands provide a sleek and modern look for grooms, while our women's wedding bands and gold wedding bands for women add a touch of elegance to any attire. Whether you're looking for a special piece for your big day or a timeless gift for an anniversary, Shop My Band's latest collection of wedding and anniversary jewelry offers something for everyone.",
  },
  {
    path: "/wedding-band",
    content:
      "Wedding bands symbolize love and commitment, suited to personal style and preference. From dazzling diamond wedding bands for that extra sparkle to unique men's wedding bands designed with modernity and elegance, and metal bands, there's an array of options to explore. The choice of metal for a wedding band is pivotal; precious yellow gold, feminine rose gold, contemporary white gold, or durable platinum provide a range of aesthetics. For women, the beauty of women's wedding bands is in their delicate and stylish designs. Comfort fit wedding bands are perfect for those seeking both individuality and ease in wear, symbolizing love sustainably.",
  },
];
