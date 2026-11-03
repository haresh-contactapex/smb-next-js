import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_HOME_PAGE, LIMITS, normalizeHomePage } from "@/lib/shared/homePage";

const clone = () => structuredClone(DEFAULT_HOME_PAGE);

test("the launch content is valid, so the first save in the admin works unchanged", () => {
  const { content, errors } = normalizeHomePage(clone());
  assert.deepEqual(errors, {});
  assert.deepEqual(content, DEFAULT_HOME_PAGE);
});

test("text is trimmed and single-line fields have their whitespace collapsed", () => {
  const input = clone();
  input.hero.title = "  dedicated   to\n love  ";
  input.story.text = "  First.\r\n\r\nSecond.  ";
  const { content, errors } = normalizeHomePage(input);
  assert.deepEqual(errors, {});
  assert.equal(content.hero.title, "dedicated to love");
  assert.equal(content.story.text, "First.\n\nSecond.");
});

test("required text and over-long text are reported under the field's dotted path", () => {
  const input = clone();
  input.hero.title = "";
  input.collections[1].label = "x".repeat(61);
  const { errors } = normalizeHomePage(input);
  assert.match(errors["hero.title"], /required/);
  assert.match(errors["collections.1.label"], /60 characters/);
});

test("links accept this site's pages and https only, never other schemes or protocol-relative addresses", () => {
  for (const good of ["/women-wedding-bands", "/collections/eternity-bands", "https://shopmyband.com/x"]) {
    const input = clone();
    input.hero.buttonHref = good;
    assert.equal(normalizeHomePage(input).errors["hero.buttonHref"], undefined, good);
  }
  for (const bad of ["javascript:alert(1)", "//evil.example", "http://insecure.example", "data:text/html,x", "/a b", "women"]) {
    const input = clone();
    input.hero.buttonHref = bad;
    assert.ok(normalizeHomePage(input).errors["hero.buttonHref"], bad);
  }
});

test("images come from the Media library or https, and a photo is required", () => {
  const input = clone();
  input.hero.photosLeft[0].src = "/uploads/2026/10/abc.jpg";
  input.collections[0].src = "javascript:alert(1)";
  input.story.imageSrc = "";
  const { errors } = normalizeHomePage(input);
  assert.equal(errors["hero.photosLeft.0.src"], undefined);
  assert.ok(errors["collections.0.src"]);
  assert.ok(errors["story.imageSrc"]);
});

test("each list keeps to its minimum and maximum length", () => {
  const input = clone();
  input.hero.photosLeft = input.hero.photosLeft.slice(0, LIMITS.heroPhotos.min - 1);
  input.perks = [];
  input.collections = Array.from({ length: LIMITS.collections.max + 1 }, () => clone().collections[0]);
  const { errors } = normalizeHomePage(input);
  assert.ok(errors["hero.photosLeft"]);
  assert.ok(errors.perks);
  assert.ok(errors.collections);
});

test("an assurance icon must be one the storefront has an image for", () => {
  const input = clone();
  input.assurances[0].icon = "../../etc/passwd";
  assert.ok(normalizeHomePage(input).errors["assurances.0.icon"]);
});

test("unknown fields are dropped and a bad photo position falls back to center", () => {
  const input = clone();
  input.extra = "<script>";
  input.hero.photosRight[0].position = "url(x) bad";
  const { content, errors } = normalizeHomePage(input);
  assert.deepEqual(errors, {});
  assert.equal("extra" in content, false);
  assert.equal(content.hero.photosRight[0].position, "center");
});

test("input that is not an object is reported field by field instead of throwing", () => {
  for (const bad of [null, undefined, "x", 5, []]) {
    const { errors } = normalizeHomePage(bad);
    assert.ok(Object.keys(errors).length > 0);
  }
});
