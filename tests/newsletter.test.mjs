import test from "node:test";
import assert from "node:assert/strict";
import { normalizeNewsletterEmail, validateNewsletterEmail } from "@/lib/shared/newsletter";
import { computeNewsletterStats } from "@/components/newsletter/helpers";
import { getPermissionModules } from "@/lib/permissions";
import { requiredPermissionForPath } from "@/lib/routePermissions";

test("newsletter addresses are trimmed and lower-cased so one address is one subscriber", () => {
  assert.equal(normalizeNewsletterEmail("  Fan@Example.COM "), "fan@example.com");
  assert.equal(normalizeNewsletterEmail(undefined), "");
});

test("validateNewsletterEmail accepts an address and explains what is wrong with the rest", () => {
  assert.equal(validateNewsletterEmail("fan@example.com"), "");
  assert.match(validateNewsletterEmail(""), /enter your email/i);
  assert.match(validateNewsletterEmail("not-an-email"), /valid email/i);
  // Anything that could read as a second recipient is refused.
  assert.match(validateNewsletterEmail("a@example.com,b@example.com"), /valid email/i);
  assert.match(validateNewsletterEmail(`${"a".repeat(250)}@example.com`), /valid email/i);
});

test("hostile input is refused: control characters, header injection, markup, odd types and SQL text", () => {
  const rejected = [
    "fan@example.com\nBcc: victim@example.com", // mail header injection
    "fan@example.com\r\n", // trimmed away, so this one is accepted below instead
    "fa\u0000n@example.com", // Postgres refuses NUL in text
    "fan@exa mple.com",
    "<script>alert(1)</script>@example.com",
    "fan@example.com<img src=x>",
    '"fan"@example.com',
    "fan@@example.com",
    "fan@example",
    "fan@-example.com",
    "fan@example..com",
    ".fan@example.com",
    "fan.@example.com",
    "fan@example.c0m",
    "fan@[127.0.0.1]",
    "fan@exämple.com", // non-ASCII: IDN domains must arrive as punycode
    `${"a".repeat(65)}@example.com`,
    "x'; DROP TABLE newsletter_subscribers;--",
    "' OR '1'='1",
  ];
  for (const value of rejected) {
    const email = normalizeNewsletterEmail(value);
    const verdict = validateNewsletterEmail(email);
    if (value === "fan@example.com\r\n") assert.equal(verdict, "", value);
    else assert.notEqual(verdict, "", JSON.stringify(value));
  }
  // A quote is a legal address character and is only ever a bound parameter, so it is not a way in.
  assert.equal(validateNewsletterEmail("o'brien+news@mail.example.co.uk"), "");
});

test("a request body that is not text cannot be coerced into an address", () => {
  for (const value of [["fan@example.com"], { toString: () => "fan@example.com" }, 42, null, true]) {
    assert.equal(normalizeNewsletterEmail(value), "");
  }
});

test("POST /api/newsletter refuses cross-site and non-JSON requests before reading anything", async () => {
  const { POST } = await import("@/app/api/newsletter/route");
  const body = JSON.stringify({ email: "bad" });
  const send = (headers) => POST(new Request("http://test.local/api/newsletter", { method: "POST", body, headers }));

  assert.equal((await send({ "content-type": "application/json", "sec-fetch-site": "cross-site" })).status, 403);
  assert.equal((await send({ "content-type": "application/json", "sec-fetch-site": "same-site" })).status, 403);
  assert.equal((await send({ "content-type": "text/plain" })).status, 415);
  assert.equal((await send({})).status, 415);
  // Same-origin JSON gets as far as validation (a bad address is a 400).
  assert.equal((await send({ "content-type": "application/json", "sec-fetch-site": "same-origin" })).status, 400);
});

test("computeNewsletterStats counts signups in the last 7 and 30 days", () => {
  const now = Date.parse("2026-11-04T12:00:00Z");
  const daysAgo = (days) => new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
  const stats = computeNewsletterStats([{ createdAt: daysAgo(1) }, { createdAt: daysAgo(10) }, { createdAt: daysAgo(40) }], now);
  assert.deepEqual(stats, { total: 3, last7Days: 1, last30Days: 2 });
});

test("the Newsletter admin page is gated by its own View permission", () => {
  assert.equal(requiredPermissionForPath("/admin/newsletter"), "newsletter.view");
  const module = getPermissionModules().find((m) => m.key === "newsletter");
  assert.deepEqual(module?.permissions.map((p) => p.key), ["newsletter.view", "newsletter.delete", "newsletter.export"]);
});
