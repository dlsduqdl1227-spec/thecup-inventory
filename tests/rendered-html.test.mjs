import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships the branded monochrome application instead of the starter preview", async () => {
  const [page, layout, app, styles, hosting, packageJson, socialImage] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/components/EduSystemApp.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL(".openai/hosting.json", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("public/og.png", root)),
  ]);

  assert.match(page, /EduSystemApp/);
  assert.match(layout, /더컵에듀 시스템/);
  assert.match(layout, /lang="ko"/);
  assert.match(app, /EDU SYSTEM/);
  assert.match(app, /수업 사용 기록/);
  assert.match(app, /로스팅 프로파일/);
  assert.match(app, /Asia\/Seoul/);
  assert.match(app, /capture="environment"/);
  assert.match(styles, /--ink: #111111/);
  assert.doesNotMatch(styles, /#17483b|#d9613e|#f3f0e7/i);
  assert.doesNotMatch(`${page}\n${layout}\n${app}`, /codex-preview|Your site is taking shape|SkeletonPreview/i);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.equal(socialImage.readUInt32BE(16), 1536);
  assert.equal(socialImage.readUInt32BE(20), 1024);

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
  assert.match(migration, /inventory_nonnegative_update/);
});

test("guards critical identity, date and persistence edge cases", async () => {
  const [http, database, bootstrap, staff, milkPurchase, roasting] = await Promise.all([
    readFile(new URL("lib/http.ts", root), "utf8"),
    readFile(new URL("lib/db.ts", root), "utf8"),
    readFile(new URL("app/api/auth/bootstrap/route.ts", root), "utf8"),
    readFile(new URL("app/api/staff/route.ts", root), "utf8"),
    readFile(new URL("app/api/inventory/milk-purchase/route.ts", root), "utf8"),
    readFile(new URL("app/api/roasting/route.ts", root), "utf8"),
  ]);

  assert.match(http, /getUTCDate\(\) !== day/);
  assert.match(http, /inventory_quantity_negative/);
  assert.match(database, /CREATE TRIGGER IF NOT EXISTS inventory_nonnegative_update/);
  assert.match(bootstrap, /WHERE NOT EXISTS \(SELECT 1 FROM staff\)/);
  assert.match(staff, /마지막 활성 관리자의 권한/);
  assert.match(milkPurchase, /last_insert_rowid\(\)/);
  assert.match(roasting, /sqlite_sequence WHERE name = 'roasting_profiles'/);
});
