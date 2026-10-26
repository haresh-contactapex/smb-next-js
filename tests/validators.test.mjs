import test from "node:test";
import assert from "node:assert/strict";
import { isValidEmail, isValidPassword, getPasswordErrorMessage, maskEmail } from "@/lib/shared/auth";
import { isValidUsPhone, formatUsPhone } from "@/lib/phone";
import { validateContact } from "@/lib/shared/checkout";

test("isValidEmail", () => {
  assert.equal(isValidEmail(" jane@shop.com "), true);
  for (const bad of ["jane", "jane@", "@shop.com", "a b@c.com", "a@b"]) assert.equal(isValidEmail(bad), false, bad);
});

test("password rules need length, a letter, a number and a symbol", () => {
  assert.equal(isValidPassword("Passw0rd!x"), true);
  assert.equal(isValidPassword("password"), false);
  assert.equal(getPasswordErrorMessage("Passw0rd!x"), null);
  assert.match(getPasswordErrorMessage("abcdefgh"), /number/);
});

test("maskEmail never returns the full address", () => {
  const masked = maskEmail("jane@shop.com");
  assert.notEqual(masked, "jane@shop.com");
  assert.match(masked, /@shop\.com$/);
});

test("US phone: optional, but exactly ten digits when present", () => {
  assert.equal(isValidUsPhone(""), true);
  assert.equal(isValidUsPhone("(555) 123-4567"), true);
  assert.equal(isValidUsPhone("555-1234"), false);
  assert.equal(formatUsPhone("5551234567"), "(555) 123-4567");
});

test("validateContact reports missing required fields", () => {
  const errors = validateContact({ firstName: "", lastName: "", email: "nope", phoneCountry: "US", phone: "" });
  assert.ok(errors.email);
  assert.ok(Object.keys(errors).length >= 2);
});
