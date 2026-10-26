import test from "node:test";
import assert from "node:assert/strict";
import { roleHasPermission, sanitizePermissions, effectivePermissions, getAllPermissionKeys, settingsPermission } from "@/lib/permissions";
import { CUSTOMER_SESSION_SCOPE, STAFF_SESSION_SCOPE, STAFF_2FA_CHALLENGE_SCOPE, CUSTOMER_SESSION_COOKIE, STAFF_SESSION_COOKIE } from "@/lib/auth/constants";
import { signJwt, verifyJwt } from "@/lib/auth/jwt";

const [someKey] = getAllPermissionKeys();

test("an inactive role holds no permission, even with full access", () => {
  assert.equal(roleHasPermission({ status: "disabled", fullAccess: true, permissions: [someKey] }, someKey), false);
  assert.equal(roleHasPermission(null, someKey), false);
});

test("full access holds every key; otherwise only the listed ones", () => {
  assert.equal(roleHasPermission({ status: "active", fullAccess: true }, someKey), true);
  assert.equal(roleHasPermission({ status: "active", permissions: [someKey] }, someKey), true);
  assert.equal(roleHasPermission({ status: "active", permissions: [] }, someKey), false);
});

test("sanitizePermissions drops unknown and non-string keys and de-duplicates", () => {
  assert.deepEqual(sanitizePermissions([someKey, someKey, "made.up", 42, null]), [someKey]);
  assert.deepEqual(sanitizePermissions("not-an-array"), []);
});

test("effectivePermissions of a full-access role is the whole matrix", () => {
  assert.deepEqual(effectivePermissions({ fullAccess: true }), getAllPermissionKeys());
});

test("settingsPermission names a key that exists in the matrix", () => {
  assert.ok(getAllPermissionKeys().includes(settingsPermission("system-maintenance", "view")));
});

test("customer, staff and challenge identities use distinct scopes and cookies", () => {
  assert.equal(new Set([CUSTOMER_SESSION_SCOPE, STAFF_SESSION_SCOPE, STAFF_2FA_CHALLENGE_SCOPE]).size, 3);
  assert.notEqual(CUSTOMER_SESSION_COOKIE, STAFF_SESSION_COOKIE);
});

test("a signed token keeps its scope, and a tampered or foreign-secret one is rejected", async () => {
  process.env.JWT_SECRET = "test-secret-test-secret-test-secret";
  const token = await signJwt({ sub: "u1", scope: CUSTOMER_SESSION_SCOPE }, "1h");
  const payload = await verifyJwt(token);
  assert.equal(payload.scope, CUSTOMER_SESSION_SCOPE);
  assert.notEqual(payload.scope, STAFF_SESSION_SCOPE);
  assert.equal(await verifyJwt(`${token}x`), null);
  assert.equal(await verifyJwt(""), null);
  process.env.JWT_SECRET = "a-different-secret-a-different-secret";
  assert.equal(await verifyJwt(token), null);
});
