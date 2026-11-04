import { createHash } from "node:crypto";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import tailwindConfig from "../../tailwind.config.js";

// Tailwind only builds the classes it finds in src/ at build time, so a class typed into a CMS page or blog post
// (ml-[40px], text-[#376d99]) would have no CSS. This runs Tailwind over a page's own HTML when it is shown and
// returns just the utility rules that HTML uses, for a <style> next to the body. Results are cached by the HTML's
// hash, so a page is compiled once per server process. A failure returns "" (the page still renders, unstyled).
//
// The rules are scoped to the element that holds the body (`scope`, an id selector). The <style> sits in the page,
// after the site's own stylesheet, so an unscoped `.md\:grid-cols-2` from the body would beat the same-specificity
// `lg:grid-cols-[...]` the footer uses and wreck the footer (and header) layout. `:where()` adds no specificity,
// so inside the body the rules rank exactly as they did unscoped.
// See docs/cms/cms.md.

const CACHE_LIMIT = 300;
const cache = new Map();

/** The id of the element that holds a CMS page's body (src/app/(site)/[slug]/page.js). */
export const CMS_BODY_SCOPE = "#cms-article";

const scopeTo = (scope) => ({
  postcssPlugin: "scope-utility-css",
  Rule(rule) {
    // Keyframe steps (from / 50% / to) are not selectors.
    if (rule.parent?.type === "atrule" && /keyframes$/i.test(rule.parent.name)) return;
    if (rule.selector.startsWith(`:where(${scope})`)) return;
    rule.selectors = rule.selectors.map((selector) => `:where(${scope}) ${selector}`);
  },
});

const compile = async (html, scope) => {
  const result = await postcss([
    tailwindcss({ ...tailwindConfig, content: [{ raw: html, extension: "html" }], corePlugins: { ...tailwindConfig.corePlugins, preflight: false } }),
    scopeTo(scope),
  ]).process("@tailwind utilities;", { from: undefined });
  // "</" can never appear in valid CSS from a class name, but a <style> must not be closable from inside.
  return result.css.replace(/\s*\n\s*/g, "").replace(/<\//g, "<\/");
};

/** Tailwind CSS for the classes used in `html`, applying only inside `scope` ("" when there are none or Tailwind fails). */
export async function utilityCssFor(html, scope = CMS_BODY_SCOPE) {
  if (typeof html !== "string" || !html.includes("class=")) return "";
  const key = createHash("sha1").update(scope).update("\0").update(html).digest("hex");
  let pending = cache.get(key);
  if (!pending) {
    pending = compile(html, scope).catch((error) => {
      cache.delete(key);
      console.error("Could not build Tailwind CSS for page HTML:", error?.message || error);
      return "";
    });
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
    cache.set(key, pending);
  }
  return pending;
}
