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

test("returns nothing for HTML without classes, and is cached", async () => {
  assert.equal(await utilityCssFor("<p>plain</p>"), "");
  const html = '<p class="mb-[13px]">a</p>';
  assert.equal(await utilityCssFor(html), await utilityCssFor(html));
});
