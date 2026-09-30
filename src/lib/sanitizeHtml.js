// Allowlist sanitizer for admin-authored product descriptions (contentEditable
// editor output or imported CSV HTML) before they are rendered on the public
// storefront with dangerouslySetInnerHTML.
//
// The output is rebuilt from tokens rather than filtered in place: every tag is
// re-emitted from the allowlist with NO attributes (except a validated <a href>),
// and every text run is escaped, so nothing from the input can reach the page
// as markup unless it is explicitly permitted here.

const ALLOWED_TAGS = new Set([
  "p", "div", "br", "strong", "b", "em", "i", "u", "s", "strike",
  "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "a",
]);

const VOID_TAGS = new Set(["br"]);

// Dropped together with everything inside them (not just the tag itself).
const DROP_WITH_CONTENT = new Set([
  "script", "style", "iframe", "object", "embed", "noscript", "template",
  "svg", "math", "textarea", "title", "head", "form", "select", "button",
]);

// Comments/doctype | opening or closing tag (quoted attribute values may contain ">").
const TOKEN_PATTERN = /<!--[\s\S]*?-->|<[!?][^>]*>|<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;

const HREF_PATTERN = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i;

// Keeps entities that are already written (&amp;, &nbsp;, &#8217;) intact and
// escapes everything else that could start markup.
function escapeText(text) {
  return text.replace(/&(?!#?[a-zA-Z0-9]+;)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttribute(value) {
  return escapeText(value).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Only literal http(s)/mailto/tel/root-relative URLs pass. The check runs on the
// raw value, so entity-encoded schemes such as "java&#115;cript:" are rejected.
function safeHref(attributes) {
  const match = HREF_PATTERN.exec(attributes);
  const href = (match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim();
  return /^(https?:\/\/|mailto:|tel:|\/(?!\/))/i.test(href) ? href : null;
}

function openingTag(name, attributes) {
  if (name !== "a") return `<${name}>`;
  const href = safeHref(attributes);
  if (!href) return null;
  const external = /^https?:\/\//i.test(href);
  return `<a href="${escapeAttribute(href)}"${external ? ' target="_blank" rel="noopener noreferrer nofollow"' : ""}>`;
}

export function sanitizeHtml(input) {
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
    if (!ALLOWED_TAGS.has(name)) continue; // unknown tag: drop the tag, keep its text

    if (closing) {
      const index = open.lastIndexOf(name);
      if (index === -1) continue;
      while (open.length > index) out += `</${open.pop()}>`;
    } else if (VOID_TAGS.has(name)) {
      out += "<br>";
    } else {
      const tag = openingTag(name, attributes);
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
