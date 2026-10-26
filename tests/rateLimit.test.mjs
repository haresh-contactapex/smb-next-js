import test from "node:test";
import assert from "node:assert/strict";
import { clientIpOf, createRateLimiter } from "@/lib/rateLimit";

const req = (headers) => ({ headers: new Headers(headers) });

test("allows up to the limit, then refuses until the window passes", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: 0 });
  const allow = createRateLimiter({ limit: 2, windowMs: 1000 });
  assert.deepEqual([allow("ip"), allow("ip"), allow("ip")], [true, true, false]);
  assert.equal(allow("other"), true);
  t.mock.timers.tick(1001);
  assert.equal(allow("ip"), true);
});

test("refused attempts are not recorded", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: 0 });
  const allow = createRateLimiter({ limit: 1, windowMs: 1000 });
  allow("ip");
  t.mock.timers.tick(500);
  assert.equal(allow("ip"), false);
  t.mock.timers.tick(501);
  assert.equal(allow("ip"), true);
});

test("clientIpOf trusts the entry the proxy appended, not what the client sent", () => {
  delete process.env.TRUSTED_PROXY_HOPS;
  assert.equal(clientIpOf(req({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" })), "203.0.113.9");
  process.env.TRUSTED_PROXY_HOPS = "2";
  assert.equal(clientIpOf(req({ "x-forwarded-for": "6.6.6.6, 203.0.113.9, 10.0.0.1" })), "203.0.113.9");
  delete process.env.TRUSTED_PROXY_HOPS;
});

test("clientIpOf is empty without proxy headers, so callers skip limiting", () => {
  assert.equal(clientIpOf(req({})), "");
  assert.equal(clientIpOf(req({ "x-real-ip": "198.51.100.4" })), "198.51.100.4");
});
