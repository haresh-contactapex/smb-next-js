import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyStripeSignature } from "@/lib/stripe";

const SECRET = "whsec_test_secret";
const BODY = JSON.stringify({ id: "evt_1", type: "payment_intent.succeeded", data: { object: { id: "pi_1" } } });
const now = () => Math.floor(Date.now() / 1000);

const sign = (body, secret, timestamp) => createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
const header = (timestamp, ...signatures) => [`t=${timestamp}`, ...signatures.map((s) => `v1=${s}`)].join(",");
const signed = (overrides = {}) => {
  const { body = BODY, secret = SECRET, timestamp = now() } = overrides;
  return header(timestamp, sign(body, secret, timestamp));
};

test("accepts a correctly signed, fresh webhook", () => {
  assert.equal(verifyStripeSignature(BODY, signed(), SECRET), true);
});

test("rejects a signature made with another secret", () => {
  assert.equal(verifyStripeSignature(BODY, signed({ secret: "whsec_other" }), SECRET), false);
});

test("rejects a body that was changed after signing", () => {
  const tampered = BODY.replace("pi_1", "pi_2");
  assert.equal(verifyStripeSignature(tampered, signed(), SECRET), false);
  assert.equal(verifyStripeSignature(`${BODY} `, signed(), SECRET), false);
});

test("rejects a timestamp that was changed after signing", () => {
  const timestamp = now();
  const forged = header(timestamp + 1, sign(BODY, SECRET, timestamp));
  assert.equal(verifyStripeSignature(BODY, forged, SECRET), false);
});

test("rejects an old capture (replay) and one from the future, accepts one inside the tolerance", () => {
  assert.equal(verifyStripeSignature(BODY, signed({ timestamp: now() - 301 }), SECRET), false);
  assert.equal(verifyStripeSignature(BODY, signed({ timestamp: now() + 301 }), SECRET), false);
  assert.equal(verifyStripeSignature(BODY, signed({ timestamp: now() - 290 }), SECRET), true);
  assert.equal(verifyStripeSignature(BODY, signed({ timestamp: now() + 290 }), SECRET), true);
});

test("the tolerance can be narrowed", () => {
  const old = signed({ timestamp: now() - 60 });
  assert.equal(verifyStripeSignature(BODY, old, SECRET, 30), false);
  assert.equal(verifyStripeSignature(BODY, old, SECRET, 120), true);
});

test("a missing header or secret never verifies", () => {
  for (const missing of [undefined, null, ""]) {
    assert.equal(verifyStripeSignature(BODY, missing, SECRET), false);
    assert.equal(verifyStripeSignature(BODY, signed(), missing), false);
  }
});

test("rejects headers without a usable timestamp or signature", () => {
  const timestamp = now();
  const good = sign(BODY, SECRET, timestamp);
  for (const bad of [
    `v1=${good}`, // no timestamp
    `t=abc,v1=${good}`, // timestamp not a number
    `t=,v1=${good}`,
    `t=${timestamp}`, // no signature
    `t=${timestamp},v1=`, // empty signature
    `t=${timestamp},v0=${good}`, // only a scheme we do not accept
    "garbage",
  ]) {
    assert.equal(verifyStripeSignature(BODY, bad, SECRET), false, bad);
  }
});

test("rejects signatures that are not hex of the right length", () => {
  const timestamp = now();
  const good = sign(BODY, SECRET, timestamp);
  for (const bad of ["zz", good.slice(0, -2), `${good}00`, "0".repeat(64), good.toUpperCase().slice(2) + "zz"]) {
    assert.equal(verifyStripeSignature(BODY, header(timestamp, bad), SECRET), false, bad);
  }
});

test("accepts any one valid v1 among several, as when Stripe rotates a secret", () => {
  const timestamp = now();
  const stale = sign(BODY, "whsec_previous", timestamp);
  const current = sign(BODY, SECRET, timestamp);
  assert.equal(verifyStripeSignature(BODY, header(timestamp, stale, current), SECRET), true);
  assert.equal(verifyStripeSignature(BODY, header(timestamp, current, stale), SECRET), true);
  assert.equal(verifyStripeSignature(BODY, header(timestamp, stale, stale), SECRET), false);
});

test("an uppercase hex signature is the same bytes and verifies", () => {
  const timestamp = now();
  assert.equal(verifyStripeSignature(BODY, header(timestamp, sign(BODY, SECRET, timestamp).toUpperCase()), SECRET), true);
});
