import test from "node:test";
import assert from "node:assert/strict";
import { holdsAllPermissions, roleCovers, getAllPermissionKeys } from "@/lib/permissions";

const role = (permissions, extra = {}) => ({ status: "active", fullAccess: false, permissions, ...extra });
const superAdmin = role([], { fullAccess: true });
const hr = role(["users.view", "users.edit", "users.create", "users.delete", "products.view"]);
const support = role(["users.view", "products.view"]);
const manager = role(["users.view", "products.view", "products.edit", "orders.view"]);

test("a role holds a set of permissions only when it has every one of them", () => {
  assert.equal(holdsAllPermissions(hr, ["users.view", "products.view"]), true);
  assert.equal(holdsAllPermissions(hr, ["users.view", "products.edit"]), false);
  assert.equal(holdsAllPermissions(hr, []), true);
});

test("full access holds everything, including permissions that do not exist yet", () => {
  assert.equal(holdsAllPermissions(superAdmin, getAllPermissionKeys()), true);
  assert.equal(holdsAllPermissions(superAdmin, ["orders.refund"]), true);
});

test("an inactive, missing or malformed actor role holds nothing", () => {
  const keys = ["users.view"];
  assert.equal(holdsAllPermissions({ ...hr, status: "inactive" }, keys), false);
  assert.equal(holdsAllPermissions({ ...superAdmin, status: "inactive" }, keys), false);
  assert.equal(holdsAllPermissions(null, keys), false);
  assert.equal(holdsAllPermissions(undefined, keys), false);
  assert.equal(holdsAllPermissions({ status: "active", fullAccess: false, permissions: "users.view" }, keys), false);
});

test("permission keys the app does not know are ignored, not treated as held or missing", () => {
  assert.equal(holdsAllPermissions(hr, ["users.view", "made.up"]), true);
  assert.equal(holdsAllPermissions(hr, ["made.up"]), true);
});

test("roleCovers: a role covers another only when it holds everything that one grants", () => {
  assert.equal(roleCovers(hr, support), true);
  assert.equal(roleCovers(hr, hr), true); // a role covers itself, so people can edit their own profile
  assert.equal(roleCovers(hr, manager), false); // products.edit and orders.view are not hr's
  assert.equal(roleCovers(support, hr), false);
});

test("roleCovers: only full access covers a full-access role", () => {
  assert.equal(roleCovers(superAdmin, superAdmin), true);
  assert.equal(roleCovers(hr, superAdmin), false);
  assert.equal(roleCovers(role(getAllPermissionKeys()), superAdmin), false); // every key is still not "full access"
  assert.equal(roleCovers({ ...superAdmin, status: "inactive" }, superAdmin), false);
  assert.equal(roleCovers(superAdmin, hr), true);
});

test("roleCovers: a user whose role row is gone grants nothing, so it is covered", () => {
  assert.equal(roleCovers(support, null), true);
});
