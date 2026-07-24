import assert from "node:assert/strict";
import test from "node:test";

import {
  formatInventoryAmount,
  formatInventoryQuantity,
  formatSignedInventoryQuantity,
} from "../lib/quantity.ts";

test("large gram quantities are presented as readable kilograms everywhere", () => {
  assert.deepEqual(formatInventoryAmount(46_000, "g"), { value: "46", unit: "kg" });
  assert.equal(formatInventoryQuantity(46_000, "g"), "46kg");
  assert.equal(formatSignedInventoryQuantity(-4_000, "g"), "-4kg");
  assert.equal(formatInventoryQuantity(950, "g"), "950g");
  assert.equal(formatInventoryQuantity(15, "kg"), "15kg");
});
