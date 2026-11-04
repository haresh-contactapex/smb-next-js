import test from "node:test";
import assert from "node:assert/strict";
import { utilityCssFor } from "../src/lib/utilityCss.js";

test("builds CSS for arbitrary-value classes in page HTML", async () => {
  const css = await utilityCssFor('<div class="ml-[40px] pt-[40px] text-[#376d99] w-[150px] sm:mt-[7px] foo-bar">x</div>');
  assert.ok(css.includes(".ml-\\[40px\\] {margin-left: 40px}"));
  assert.ok(css.includes(".pt-\\[40px\\] {padding-top: 40px}"));
  assert.match(css, /color: rgb\(55 109 153/);
  assert.match(css, /width: 150px/);
  assert.match(css, /@media/);
  assert.doesNotMatch(css, /foo-bar|\*,\s*::before/);
});

test("scopes every rule to the body element so it cannot restyle the footer or header", async () => {
  const css = await utilityCssFor('<div class="md:grid-cols-2 group hover:text-white animate-spin"><i class="group-hover:text-black"></i></div>');
  assert.match(css, /:where\(#cms-article\) \.md\\:grid-cols-2/);
  assert.match(css, /:where\(#cms-article\) \.group:hover \.group-hover\\:text-black/);
  assert.match(css, /@keyframes spin\s*\{\s*to\s*\{/);
  // every selector (the text before a "{" that is not an at-rule or keyframe step) starts with the scope
  const selectors = [...css.matchAll(/(?:^|[};])\s*([^{};@]+)\{/g)].map((m) => m[1].trim()).filter((s) => !/^(to|from|\d+%)$/.test(s));
  assert.ok(selectors.length > 0);
  for (const selector of selectors) assert.ok(selector.startsWith(":where(#cms-article) "), selector);
});

test("takes a different scope, cached separately", async () => {
  const html = '<p class="mb-[17px]">a</p>';
  const post = await utilityCssFor(html, "#blog-article");
  assert.ok(post.includes(":where(#blog-article) .mb-\\[17px\\]"));
  assert.ok((await utilityCssFor(html)).includes(":where(#cms-article) .mb-\\[17px\\]"));
});

test("returns nothing for HTML without classes, and is cached", async () => {
  assert.equal(await utilityCssFor("<p>plain</p>"), "");
  const html = '<p class="mb-[13px]">a</p>';
  assert.equal(await utilityCssFor(html), await utilityCssFor(html));
});
