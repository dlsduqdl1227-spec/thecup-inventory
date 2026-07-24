import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships the branded application instead of the starter preview", async () => {
  const [page, layout, app, hosting, packageJson] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/components/EduSystemApp.tsx", root), "utf8"),
    readFile(new URL(".openai/hosting.json", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);

  assert.match(page, /EduSystemApp/);
  assert.match(layout, /더컵에듀 시스템/);
  assert.match(layout, /lang="ko"/);
  assert.match(app, /EDU SYSTEM/);
  assert.match(app, /수업 사용 기록/);
  assert.match(app, /로스팅 프로파일/);
  assert.doesNotMatch(`${page}\n${layout}\n${app}`, /codex-preview|Your site is taking shape|SkeletonPreview/i);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  const bindings = JSON.parse(hosting);
  assert.equal(bindings.d1, "DB");
  assert.equal(bindings.r2, "RECEIPTS");
});

test("migration covers identity, finance, inventory, receipts and roasting", async () => {
  const migration = await readFile(
    new URL("drizzle/0000_mixed_night_nurse.sql", root),
    "utf8",
  );
  for (const table of [
    "staff",
    "sessions",
    "monthly_finance",
    "finance_transactions",
    "inventory_items",
    "inventory_movements",
    "roasting_profiles",
    "roasting_points",
    "audit_logs",
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE \\\`${table}\\\``));
  }
  assert.match(migration, /receipt_key/);
  assert.match(migration, /development_ratio/);
});
