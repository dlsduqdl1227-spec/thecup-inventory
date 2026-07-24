import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(
  new URL("../lib/receipt-retention.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const retention = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

test("keeps receipts when the projected storage stays at or below 8GB", () => {
  const plan = retention.planReceiptCleanup(
    [{ key: "receipts/old.jpg", size: 7_900_000_000, uploaded: "2024-01-01" }],
    100_000_000,
  );

  assert.deepEqual(plan.keys, []);
  assert.equal(plan.projectedBytes, 8_000_000_000);
});

test("archives the oldest receipts until storage falls below the 7GB target", () => {
  const objects = Array.from({ length: 9 }, (_, index) => ({
    key: `receipts/${String(index + 1).padStart(2, "0")}.jpg`,
    size: 1_000_000_000,
    uploaded: new Date(Date.UTC(2024, index, 1)),
  }));
  const plan = retention.planReceiptCleanup(objects, 500_000_000);

  assert.deepEqual(plan.keys, [
    "receipts/01.jpg",
    "receipts/02.jpg",
    "receipts/03.jpg",
  ]);
  assert.equal(plan.bytesReclaimed, 3_000_000_000);
  assert.equal(plan.projectedBytes, 6_500_000_000);
});

test("rejects invalid incoming file sizes", () => {
  assert.throws(
    () => retention.planReceiptCleanup([], Number.NaN),
    /영수증 파일 크기/,
  );
});
