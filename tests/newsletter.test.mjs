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
