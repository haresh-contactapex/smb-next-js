// Allowlist sanitizer for admin-authored HTML (contentEditable/rich-text editor
// output or imported CSV HTML) before it is rendered on the public storefront
// with dangerouslySetInnerHTML.
//
// The output is rebuilt from tokens rather than filtered in place: every tag is
// re-emitted from the allowlist with only the attributes its profile permits
// (each one validated), and every text run is escaped, so nothing from the
// input can reach the page as markup unless it is explicitly permitted here.
//
// Two profiles:
//   "basic" (default)  product descriptions: text formatting, lists, links.
//                      Tags carry no attributes except a validated <a href>.
//   "cms"              CMS pages: adds images, tables, rules and figures, a
//                      small set of CSS classes (buttons, alignment) and the
//                      few attributes those need.

const BASIC_TAGS = [
  "p", "div", "br", "strong", "b", "em", "i", "u", "s", "strike",
  "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "a",
];

const CMS_TAGS = [
  ...BASIC_TAGS,
  "img", "hr", "figure", "figcaption", "sup", "sub", "code", "pre",
  "table", "caption", "thead", "tbody", "tfoot", "tr", "th", "td",
];

const VOID_TAGS = new Set(["br", "hr", "img"]);

// Dropped together with everything inside them (not just the tag itself).
const DROP_WITH_CONTENT = new Set([
  "script", "style", "iframe", "object", "embed", "noscript", "template",
  "svg", "math", "textarea", "title", "head", "form", "select", "button",
]);

// The only classes a page may carry. The editor produces them and storefront.css styles them:
//   links      cms-btn (red button), cms-btn-outline (outlined button)
//   text       cms-align-center / cms-align-right, cms-lg (large heading), cms-accent (blue uppercase heading),
//              cms-small (fine print),
//              cms-or (a paragraph drawn as a line either side of its text)
//   tables     cms-plain (no grid), cms-striped (dark header, shaded rows), cms-cards (a grid of cards),
//              cms-columns (side-by-side content, one cell per column),
//              cms-products (a row of four product cards), cms-hero (a picture beside text, edge to edge) and
//              cms-tiles (a grid of three category tiles per row)
//   images     cms-photo-right (a rounded photo floated to the right of the text)
//   embeds     cms-embed-contact-form (a paragraph the storefront replaces with the contact form)
const CMS_CLASSES = new Set([
  "cms-btn", "cms-btn-outline", "cms-align-center", "cms-align-right",
  "cms-lg", "cms-accent", "cms-or", "cms-plain", "cms-striped", "cms-cards", "cms-columns", "cms-products", "cms-hero", "cms-tiles", "cms-small", "cms-photo-right",
  "cms-embed-contact-form",
]);

// A profile allows `tags`; `attributes` says whether anything beyond the basic
// <a href> may be kept.
const PROFILES = {
  basic: { tags: new Set(BASIC_TAGS), extended: false },
  cms: { tags: new Set(CMS_TAGS), extended: true },
};

// Comments/doctype | opening or closing tag (quoted attribute values may contain ">").
const TOKEN_PATTERN = /<!--[\s\S]*?-->|<[!?][^>]*>|<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;

// name, then an optional quoted or bare value. A quoted value is consumed as one
// unit, so text inside it (data-href="...") is never mistaken for an attribute.
const ATTRIBUTE_PATTERN = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

// Keeps entities that are already written (&amp;, &nbsp;, &#8217;) intact and
// escapes everything else that could start markup.
function escapeText(text) {
  return text.replace(/&(?!#?[a-zA-Z0-9]+;)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttribute(value) {
  return escapeText(value).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// First occurrence of each attribute wins, as in a browser.
function parseAttributes(attributes) {
  const map = new Map();
  for (const [, rawName, doubleQuoted, singleQuoted, bare] of attributes.matchAll(ATTRIBUTE_PATTERN)) {
    const name = rawName.toLowerCase();
    if (!map.has(name)) map.set(name, (doubleQuoted ?? singleQuoted ?? bare ?? "").trim());
  }
  return map;
}

// Only literal http(s)/mailto/tel/root-relative URLs pass (and #anchors in the cms
// profile). The check runs on the raw value, so entity-encoded schemes such as
// "java&#115;cript:" are rejected.
function safeHref(href, profile) {
  const pattern = profile.extended ? /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i : /^(https?:\/\/|mailto:|tel:|\/(?!\/))/i;
  return pattern.test(href) ? href : null;
}

// Images: https or a path on this site. No data: or protocol-relative URLs.
function safeImageSrc(src) {
  return /^(https:\/\/|\/(?!\/))/i.test(src) ? src : null;
}

const smallInteger = (value, max) => (/^\d{1,4}$/.test(value) && Number(value) >= 1 && Number(value) <= max ? Number(value) : null);

// The allowlisted classes in `class`, plus the alignment an editor writes as
// style="text-align: center", turned into a class so no style attribute survives.
function safeClasses(attrs) {
  const classes = new Set((attrs.get("class") || "").split(/\s+/).filter((token) => CMS_CLASSES.has(token)));
  const align = /(?:^|;)\s*text-align\s*:\s*(center|right)\b/i.exec(attrs.get("style") || "");
  if (align) {
    classes.delete("cms-align-center");
    classes.delete("cms-align-right");
    classes.add(`cms-align-${align[1].toLowerCase()}`);
  }
  return [...classes];
}

function openingTag(name, rawAttributes, profile) {
  const attrs = parseAttributes(rawAttributes);
  const out = [];

  if (name === "a") {
    const href = safeHref(attrs.get("href") || "", profile);
    if (!href) return null;
    out.push(` href="${escapeAttribute(href)}"`);
    if (/^https?:\/\//i.test(href)) out.push(' target="_blank" rel="noopener noreferrer nofollow"');
  } else if (name === "img") {
    const src = profile.extended ? safeImageSrc(attrs.get("src") || "") : null;
    if (!src) return null;
    out.push(` src="${escapeAttribute(src)}"`, ` alt="${escapeAttribute(attrs.get("alt") || "")}"`, ' loading="lazy"');
    const width = smallInteger(attrs.get("width") || "", 4000);
    const height = smallInteger(attrs.get("height") || "", 4000);
    if (width) out.push(` width="${width}"`);
    if (height) out.push(` height="${height}"`);
  } else if (profile.extended && (name === "td" || name === "th")) {
    const colspan = smallInteger(attrs.get("colspan") || "", 20);
    const rowspan = smallInteger(attrs.get("rowspan") || "", 20);
    if (colspan > 1) out.push(` colspan="${colspan}"`);
    if (rowspan > 1) out.push(` rowspan="${rowspan}"`);
  }

  if (profile.extended) {
    const classes = safeClasses(attrs);
    if (classes.length) out.push(` class="${classes.join(" ")}"`);
  }
  return `<${name}${out.join("")}>`;
}

export function sanitizeHtml(input, { profile: profileName = "basic" } = {}) {
  const profile = PROFILES[profileName] || PROFILES.basic;
  const html = String(input ?? "");
  const open = [];
  let out = "";
  let last = 0;
  let skipping = null;

  for (const match of html.matchAll(TOKEN_PATTERN)) {
    const [whole, closing, rawName, attributes = ""] = match;
    if (!skipping) out += escapeText(html.slice(last, match.index));
    last = match.index + whole.length;
    if (!rawName) continue;

    const name = rawName.toLowerCase();
    if (skipping) {
      if (closing && name === skipping) skipping = null;
      continue;
    }
    if (DROP_WITH_CONTENT.has(name)) {
      if (!closing && !attributes.trimEnd().endsWith("/")) skipping = name;
      continue;
    }
    if (!profile.tags.has(name)) continue; // unknown tag: drop the tag, keep its text

    if (closing) {
      const index = open.lastIndexOf(name);
      if (index === -1) continue;
      while (open.length > index) out += `</${open.pop()}>`;
    } else if (VOID_TAGS.has(name)) {
      const tag = openingTag(name, attributes, profile);
      if (tag) out += tag;
    } else {
      const tag = openingTag(name, attributes, profile);
      if (tag) {
        out += tag;
        open.push(name);
      }
    }
  }

  if (!skipping) out += escapeText(html.slice(last));
  while (open.length) out += `</${open.pop()}>`;
  return out;
}

// CMS page bodies (see src/lib/cms.js).
export const sanitizeCmsHtml = (input) => sanitizeHtml(input, { profile: "cms" });
