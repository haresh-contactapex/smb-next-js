import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeHtml, sanitizeCmsHtml } from "@/lib/sanitizeHtml";

const basic = (html) => sanitizeHtml(html);
const cms = (html) => sanitizeCmsHtml(html);

test("keeps the formatting the editor produces", () => {
  assert.equal(basic("<p>Hello <strong>bold</strong> and <em>italic</em></p>"), "<p>Hello <strong>bold</strong> and <em>italic</em></p>");
  assert.equal(basic("<ul><li>One</li><li>Two</li></ul>"), "<ul><li>One</li><li>Two</li></ul>");
  assert.equal(basic("Line<br>break"), "Line<br>break");
});

test("null, undefined and numbers become text", () => {
  assert.equal(basic(null), "");
  assert.equal(basic(undefined), "");
  assert.equal(basic(42), "42");
});

test("text is escaped and existing entities are kept", () => {
  assert.equal(basic("1 < 2 > 0 & more"), "1 &lt; 2 &gt; 0 &amp; more");
  assert.equal(basic("Fish &amp; chips &#8217; &nbsp;"), "Fish &amp; chips &#8217; &nbsp;");
});

test("script, style and other dangerous elements are dropped with their content", () => {
  for (const [input, expected] of [
    ["<p>a</p><script>alert(1)</script><p>b</p>", "<p>a</p><p>b</p>"],
    ["x<style>body{display:none}</style>y", "xy"],
    ["x<iframe src=//evil.test></iframe>y", "xy"],
    ["x<object data=a></object>y", "xy"],
    ["x<embed src=a>y", "xy"],
    ["x<svg onload=alert(1)><circle/></svg>y", "xy"],
    ["x<math><mi>1</mi></math>y", "xy"],
    ["x<form action=/steal><input name=p></form>y", "xy"],
    ["x<button onclick=a()>go</button>y", "xy"],
    ["x<textarea><script>1</script></textarea>y", "xy"],
    ["x<noscript><img src=x onerror=alert(1)></noscript>y", "xy"],
    ["x<template><script>1</script></template>y", "xy"],
  ]) {
    assert.equal(basic(input), expected, input);
    assert.equal(cms(input), expected, `cms: ${input}`);
  }
});

test("<embed> is dropped on its own: it has no content to skip to", () => {
  assert.equal(basic("x<embed src=a>y"), "xy");
  assert.equal(basic("x<embed src=a/>y"), "xy");
});

test("an unclosed script swallows the rest instead of leaking it", () => {
  assert.equal(basic("<p>safe</p><script>alert(1)"), "<p>safe</p>");
  assert.equal(basic("<p>safe</p><SCRIPT SRC=//evil.test/x.js>"), "<p>safe</p>");
});

test("event handlers and style never survive, whatever the tag", () => {
  assert.equal(basic('<p onclick="alert(1)" style="color:red">hi</p>'), "<p>hi</p>");
  assert.equal(basic("<p/onclick=alert(1)>hi</p>"), "<p>hi</p>");
  assert.equal(cms('<p onmouseover="alert(1)" style="background:url(javascript:1)">hi</p>'), "<p>hi</p>");
  assert.equal(cms('<td onclick="x()" colspan="2">c</td>'), '<td colspan="2">c</td>');
});

test("unlisted tags lose the tag but keep the text", () => {
  assert.equal(basic("<marquee>news</marquee>"), "news");
  assert.equal(basic("<img src=x onerror=alert(1)>text"), "text");
  assert.equal(basic("<custom-tag>a</custom-tag>"), "a");
});

test("links: only http(s), mailto, tel and root-relative hrefs survive", () => {
  assert.equal(basic('<a href="https://shop.test/x">go</a>'), '<a href="https://shop.test/x">go</a>');
  assert.equal(basic('<a href="/sale">go</a>'), '<a href="/sale">go</a>');
  assert.equal(basic('<a href="mailto:a@b.test">m</a>'), '<a href="mailto:a@b.test">m</a>');
  assert.equal(basic('<a href="tel:+15551234567">t</a>'), '<a href="tel:+15551234567">t</a>');
  for (const href of [
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    " javascript:alert(1)",
    "java&#115;cript:alert(1)",
    "java\tscript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "//evil.test/x",
    "evil.test/x",
    "",
  ]) {
    const out = basic(`<a href="${href}">click</a>`);
    assert.equal(out, "click", href);
  }
  assert.equal(basic("<a>no href</a>"), "no href");
});

test("an anchor is only a link target in the cms profile", () => {
  assert.equal(basic('<a href="#top">up</a>'), "up");
  assert.equal(cms('<a href="#top">up</a>'), '<a href="#top">up</a>');
});

test("target=_blank gets rel=noopener, and only for web links", () => {
  assert.equal(
    basic('<a href="https://shop.test" target="_blank">x</a>'),
    '<a href="https://shop.test" target="_blank" rel="noopener noreferrer nofollow">x</a>'
  );
  assert.equal(basic('<a href="/page" target="_blank">x</a>'), '<a href="/page">x</a>');
  assert.equal(basic('<a href="https://shop.test" target="_top">x</a>'), '<a href="https://shop.test">x</a>');
});

test("attribute values cannot break out of their quotes", () => {
  const out = basic('<a href="https://shop.test/?q=&quot;><script>alert(1)</script>">x</a>');
  assert.ok(!/<script/i.test(out), out);
  // The quote is escaped, so "onclick=" stays inside the href value rather than becoming an attribute.
  const quoted = basic(`<a href='https://shop.test/" onclick="alert(1)'>x</a>`);
  assert.equal(quoted, '<a href="https://shop.test/&quot; onclick=&quot;alert(1)">x</a>');
  assertSafe(quoted, ALLOWED_BASIC, "quoted href");
});

test("a first attribute wins over a duplicate, as in a browser", () => {
  assert.equal(basic('<a href="https://ok.test" href="javascript:alert(1)">x</a>'), '<a href="https://ok.test">x</a>');
});

test("tags are closed and mis-nested ones repaired so markup cannot leak out of its block", () => {
  assert.equal(basic("<p><strong>open"), "<p><strong>open</strong></p>");
  assert.equal(basic("</div>stray close"), "stray close");
  assert.equal(basic("<b><i>x</b></i>"), "<b><i>x</i></b>");
});

test("comments, doctypes and processing instructions are removed", () => {
  assert.equal(basic("a<!-- <script>alert(1)</script> -->b"), "ab");
  assert.equal(basic("<!DOCTYPE html>a<?php echo 1 ?>b"), "ab");
  assert.equal(basic("a<!--[if IE]><script>1</script><![endif]-->b"), "ab");
});

test("a quoted > inside an attribute does not end the tag early", () => {
  assert.equal(basic('<p title="a>b" onclick="x()">hi</p>'), "<p>hi</p>");
  assert.equal(basic('<a href="https://shop.test/?a>b">x</a>'), '<a href="https://shop.test/?a&gt;b">x</a>');
});

test("cms images: https or site-relative only, with bounded dimensions", () => {
  assert.equal(
    cms('<img src="https://cdn.test/a.jpg" alt="A ring" width="300" height="200" onerror="x()">'),
    '<img src="https://cdn.test/a.jpg" alt="A ring" loading="lazy" width="300" height="200">'
  );
  assert.equal(cms('<img src="/uploads/a.png">'), '<img src="/uploads/a.png" alt="" loading="lazy">');
  for (const src of ["http://cdn.test/a.jpg", "data:image/svg+xml,<svg onload=alert(1)>", "javascript:alert(1)", "//evil.test/a.png", "", "a.png"]) {
    assert.equal(cms(`<img src="${src}">`), "", src);
  }
  assert.equal(cms('<img src="/a.png" width="99999" height="-1">'), '<img src="/a.png" alt="" loading="lazy">');
  assert.equal(cms('<img src="/a.png" alt=\'"><script>1</script>\'>'), '<img src="/a.png" alt="&gt;&lt;script&gt;1&lt;/script&gt;" loading="lazy">'.replace("alt=\"&gt;", "alt=\"&quot;&gt;"));
});

test("basic never allows images, tables or classes", () => {
  assert.equal(basic('<img src="https://cdn.test/a.jpg">x'), "x");
  assert.equal(basic('<table><tr><td class="cms-btn">c</td></tr></table>'), "c");
  assert.equal(basic('<p class="cms-lg">t</p>'), "<p>t</p>");
});

test("cms classes: allowlisted and author classes are kept, markup-breaking ones are not", () => {
  assert.equal(cms('<p class="cms-lg cms-align-center">t</p>'), '<p class="cms-lg cms-align-center">t</p>');
  assert.equal(cms('<p class="sm:grid-cols-2 border-t-[5px]">t</p>'), '<p class="sm:grid-cols-2 border-t-[5px]">t</p>');
  // An entity-encoded quote stays encoded inside the value, so it cannot close the attribute.
  const encoded = cms('<p class="ok &quot;onmouseover=alert(1)">t</p>');
  assert.equal(encoded, '<p class="ok &quot;onmouseover=alert(1)">t</p>');
  assertSafe(encoded, new Set(["p"]), "encoded quote");
  const out = cms(`<p class='a"b c<d e\`f g\\h'>t</p>`);
  assert.equal(out, "<p>t</p>");
  assert.equal(cms('<p class="' + Array.from({ length: 30 }, (_, i) => `c${i}`).join(" ") + '">t</p>').match(/c\d+/g).length, 20);
});

test("text-align in a style attribute becomes a class and no style survives", () => {
  assert.equal(cms('<p style="text-align: center; color: red">t</p>'), '<p class="cms-align-center">t</p>');
  assert.equal(cms('<p style="TEXT-ALIGN:right">t</p>'), '<p class="cms-align-right">t</p>');
  assert.equal(cms('<p style="color:red">t</p>'), "<p>t</p>");
});

test("cms tables keep only bounded colspan and rowspan", () => {
  assert.equal(cms('<table><tr><td colspan="2" rowspan="1">a</td><th colspan="99">b</th></tr></table>'), '<table><tr><td colspan="2">a</td><th>b</th></tr></table>');
});

// The invariants the storefront relies on, checked across a corpus of known XSS vectors:
// whatever goes in, the output has no script-capable element, no event-handler or style
// attribute, no script URL, and only tags from the profile.
const VECTORS = [
  "<script>alert(1)</script>",
  "<img src=x onerror=alert(1)>",
  "<svg/onload=alert(1)>",
  "<body onload=alert(1)>",
  "<iframe srcdoc='<script>alert(1)</script>'></iframe>",
  "<a href=javascript:alert(1)>x</a>",
  "<a href='  javascript:alert(1)'>x</a>",
  "<a href=\"jav&#x61;script:alert(1)\">x</a>",
  "<a href=\"&#106;avascript:alert(1)\">x</a>",
  "<a href=data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==>x</a>",
  "<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>",
  "<noscript><p title=\"</noscript><img src=x onerror=alert(1)>\">",
  "<p title=\"</p><script>alert(1)</script>\">x</p>",
  "<<script>alert(1)//<</script>",
  "<scr<script>ipt>alert(1)</scr</script>ipt>",
  "<ScRiPt>alert(1)</sCrIpT>",
  "<div style=\"background:url(javascript:alert(1))\">x</div>",
  "<div style=\"width:expression(alert(1))\">x</div>",
  "<input onfocus=alert(1) autofocus>",
  "<details open ontoggle=alert(1)>",
  "<video><source onerror=alert(1)></video>",
  "<link rel=stylesheet href=//evil.test/x.css>",
  "<meta http-equiv=refresh content='0;url=javascript:alert(1)'>",
  "<base href=//evil.test/>",
  "<a href=\"https://ok.test\" onclick=alert(1)>x</a>",
  "<a\nhref=\"javascript:alert(1)\">x</a>",
  "<a href=\"https://ok.test\"\nonmouseover=\"alert(1)\">x</a>",
  "<p>\u0000<script>alert(1)</script></p>",
  "<img src=\"x\" alt=\"\" onerror=\"alert(1)\"//>",
  "<form><button formaction=javascript:alert(1)>x</button></form>",
  "<table background=javascript:alert(1)><tr><td>x</td></tr></table>",
  "<img src=\"https://ok.test/a.jpg\" srcset=\"javascript:alert(1) 1x\">",
  "<a href=\"https://ok.test\" target=\"_blank\" rel=\"opener\">x</a>",
];

const TAG = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|[^">])*)>/g;
const ALLOWED_BASIC = new Set(["p", "div", "br", "strong", "b", "em", "i", "u", "s", "strike", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "a"]);
const ALLOWED_CMS_EXTRA = new Set(["img", "hr", "figure", "figcaption", "sup", "sub", "code", "pre", "span", "table", "caption", "thead", "tbody", "tfoot", "tr", "th", "td"]);
const ALLOWED_ATTRIBUTES = new Set(["href", "target", "rel", "src", "alt", "loading", "width", "height", "colspan", "rowspan", "class"]);

function assertSafe(output, allowedTags, label) {
  assert.ok(!/<\s*(script|style|iframe|object|embed|svg|math|form|input|button|link|meta|base)\b/i.test(output), `${label}: dangerous element in ${output}`);
  for (const [, name, rawAttributes] of output.matchAll(TAG)) {
    assert.ok(allowedTags.has(name), `${label}: unexpected <${name}> in ${output}`);
    for (const [, attribute] of rawAttributes.matchAll(/\s([^\s=]+)(?:="[^"]*")?/g)) {
      assert.ok(ALLOWED_ATTRIBUTES.has(attribute), `${label}: unexpected attribute ${attribute} in ${output}`);
    }
    for (const [, value] of rawAttributes.matchAll(/(?:href|src)="([^"]*)"/g)) {
      assert.ok(/^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(value), `${label}: unsafe URL ${value} in ${output}`);
    }
  }
  // After the tags are removed, no "<" can remain that a browser could read as one.
  assert.ok(!/<[a-zA-Z!?\/]/.test(output.replace(TAG, "")), `${label}: stray markup in ${output}`);
}

test("XSS corpus: output stays inside the allowlist for both profiles", () => {
  for (const vector of VECTORS) {
    assertSafe(basic(vector), ALLOWED_BASIC, `basic ${JSON.stringify(vector)}`);
    assertSafe(cms(vector), new Set([...ALLOWED_BASIC, ...ALLOWED_CMS_EXTRA]), `cms ${JSON.stringify(vector)}`);
  }
});

test("sanitizing is idempotent: running it again changes nothing", () => {
  for (const vector of [...VECTORS, "<p>fine <b>text</b> &amp; more</p>", '<p class="cms-lg">x</p>']) {
    const once = cms(vector);
    assert.equal(cms(once), once, JSON.stringify(vector));
    const onceBasic = basic(vector);
    assert.equal(basic(onceBasic), onceBasic, JSON.stringify(vector));
  }
});
