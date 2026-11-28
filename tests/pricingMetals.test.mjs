import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateAdjustedPrice,
  metalGroupOf,
  parseApplyScope,
  parseMetalRules,
  toMetalRulesPayload,
  validateMetalRulesForm,
} from "@/lib/shared/settingsPricing";

test("every karat and gold colour counts toward its metal group", () => {
  for (const value of ["14K", "14k Rose Gold", "14K White Gold", "14KY", "14KR", "14 K Yellow"]) assert.equal(metalGroupOf(value), "14k", value);
  for (const value of ["18K", "18K Rose Gold PVD and Black PVD", "18KW"]) assert.equal(metalGroupOf(value), "18k", value);
  for (const value of ["Platinum", "platinum 950", "PT", "PT950"]) assert.equal(metalGroupOf(value), "platinum", value);
});

test("other metals belong to no group", () => {
  for (const value of ["Titanium", "Cobalt", "10K Yellow Gold", "Black", "", null, undefined]) assert.equal(metalGroupOf(value), null, String(value));
});

test("calculateAdjustedPrice handles fixed and percentage, clamps at 0 and rounds to cents", () => {
  assert.equal(calculateAdjustedPrice(1200, 100, "fixed", "increase"), 1300);
  assert.equal(calculateAdjustedPrice(1600, 20, "percentage", "increase"), 1920);
  assert.equal(calculateAdjustedPrice(50, 100, "fixed", "decrease"), 0);
  assert.equal(calculateAdjustedPrice("10.00", "3.333", "percentage", "increase"), 10.33);
});

test("parseMetalRules accepts one rule per metal and rejects bad input", () => {
  const rule = { metal: "14k", adjustmentValue: "100", adjustmentType: "fixed", adjustmentDirection: "increase" };
  assert.deepEqual(parseMetalRules([rule]).rules, [rule]);
  assert.equal(parseMetalRules([]).error, "Select at least one metal to adjust.");
  assert.equal(parseMetalRules(undefined).error, "Select at least one metal to adjust.");
  assert.match(parseMetalRules([rule, rule]).error, /more than once/);
  assert.match(parseMetalRules([{ ...rule, metal: "gold" }]).error, /valid metal/);
  assert.match(parseMetalRules([{ ...rule, adjustmentValue: "-5" }]).error, /14K/);
  assert.match(parseMetalRules([{ ...rule, adjustmentType: "x" }]).error, /type/);
  assert.match(parseMetalRules([{ ...rule, adjustmentDirection: "x" }]).error, /direction/);
});

test("parseApplyScope defaults to every product and requires categories when scoped", () => {
  assert.deepEqual(parseApplyScope({}), { categoryIds: null });
  assert.deepEqual(parseApplyScope({ scope: "all", categoryIds: ["x"] }), { categoryIds: null });
  assert.ok(parseApplyScope({ scope: "categories", categoryIds: [] }).error);
  assert.ok(parseApplyScope({ scope: "bogus" }).error);
  const id = "11111111-1111-4111-8111-111111111111";
  assert.deepEqual(parseApplyScope({ scope: "categories", categoryIds: [id] }), { categoryIds: [id] });
});

test("the metal form needs a ticked row with a valid value and posts only ticked rows", () => {
  const row = (metal, patch = {}) => ({ metal, enabled: true, adjustmentValue: "10", adjustmentType: "percentage", adjustmentDirection: "increase", ...patch });
  assert.equal(validateMetalRulesForm([row("14k", { enabled: false })]).valid, false);
  assert.equal(validateMetalRulesForm([row("14k", { adjustmentValue: "" })]).errors["14k"], "Enter a value.");
  assert.ok(validateMetalRulesForm([row("14k", { adjustmentValue: "1.234" })]).errors["14k"]);
  assert.equal(validateMetalRulesForm([row("14k"), row("18k", { enabled: false, adjustmentValue: "bad" })]).valid, true);
  assert.deepEqual(toMetalRulesPayload([row("14k"), row("18k", { enabled: false })]).map((r) => r.metal), ["14k"]);
});
